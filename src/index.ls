module.exports =
  pkg:
    name: 'curve-bar', version: '0.0.1'
    # lite: 不帶 d3 的 base. 補間改用 chart.anim, 可以逐格錄影 ( 見 @plotdb/chart utils/anim )
    extend: {name: "@makechart/base", path: "lite/index.html"}
    dependencies: []

  init: ({root, context, pubsub}) ->
    pubsub.fire \init, mod: mod {context}

mod = ({context}) ->
  {chart} = context
  {scale: Scale, shape, anim: {join}} = chart.utils
  svgns = "http://www.w3.org/2000/svg"
  sample: ->
    raw: [1 to 5].map (val) ~> {val: (10 * Math.random!).toFixed(1), name: "N#{val}"}
    binding:
      name: {key: \name}
      value: {key: \val}
  config: chart.utils.config.from({
    preset: \default
    legend: \legend
  }) <<<
    sort: type: \choice, values: <[asc desc none]>, default: \desc
    curve:
      padding: type: \number, default: 0.1, min: 0, max: 1, step: 0.01
      hole: type: \number, default: 0.5, min: 0, max: 1, step: 0.01
  dimension:
    value: {type: \R, name: "value"}
    name: {type: \N, name: "name"}
  init: ->
    @gview = @layout.get-group \view
    @g = @gview.appendChild document.createElementNS(svgns, \g)
    @tint = tint = new chart.utils.tint!
    @parsed = []

    @arc = shape.arc!
      .innerRadius 0
      .outerRadius 100
      .startAngle 0
      .endAngle(Math.PI / 2)

    @legend = new chart.utils.legend do
      root: @root
      name: 'legend'
      shape: (d) -> @setAttribute \fill, tint.get d.text
      layout: @layout
    @legend.on \select, ~> @parse!; @bind!; @resize!; @render!

  parse: ->
    @tint.reset!
    @parsed = @data.map (d,i) ~>
      ret = {_i: i} <<< d
      if !(n = @parsed.filter(-> it._i == i).0) => return ret
      ret <<< n{cur, old}
      return ret

    # 同 d3.extent: 略過 null / NaN
    vs = @parsed.map(-> it.value).filter -> it? and it >= it
    @extent =
      v: if vs.length => [Math.min.apply(Math, vs), Math.max.apply(Math, vs)] else [undefined, undefined]
    @legend.data @parsed.map -> {key: it.name, text: it.name}

  resize: ->
    @root.querySelector('.pdl-layout').classList.toggle \legend-bottom, (@cfg.legend.position == \bottom)
    @legend.config({} <<< @cfg.legend)
    @legend.update!
    @layout.update false
    @parsed.sort (a,b) ~>
      if @cfg.sort == \asc => b.value - a.value
      else if @cfg.sort == \desc => a.value - b.value
      else a._idx - b._idx
    box = @layout.get-box \view
    @layout.get-node \view .style.width = "#{box.height}px"
    @layout.update false
    box = @layout.get-box \view
    [w,h] = [box.width, box.height]
    size = Math.min(w,h)
    @scale =
      v: Scale.linear!domain [0, @extent.v.1] .range [0, Math.PI * 3 / 2]
      r: Scale.band!
        .domain (@parsed.filter(->!it._removing).map (d,i) -> i)
        .range [@cfg.curve.hole * size/2, size/2]
  render: ->
    {scale} = @
    bw = @scale.r.bandwidth!
    @arc.cornerRadius bw/2
    if @cfg? and @cfg.palette => @tint.set(@cfg.palette.colors.map -> it.value or it)
    @legend.render!
    _parsed = @parsed.filter ~> @legend.is-selected it.name
    _parsed.map (d,i) ~>
      d.old = d.cur or {a: 0, ri: scale.r(i) + bw/2, ro: scale.r(i) + bw/2}
      d.cur =
        a: scale.v(d.value)
        ri: scale.r(i) + bw/2 - bw/2 * (1 - @cfg.curve.padding)
        ro: scale.r(i) + bw/2 + bw/2 * (1 - @cfg.curve.padding)

    interpolate-arc = (a1, a2, i) ~> (t) ~>
      @arc
        .startAngle 0
        .endAngle (a2.a - a1.a) * t + a1.a
        .innerRadius (a2.ri - a1.ri) * t + a1.ri
        .outerRadius (a2.ro - a1.ro) * t + a1.ro
      @arc!

    box = @layout.get-box \view
    @g.setAttribute \transform, "translate(#{box.width / 2},#{box.height / 2})"
    tween = (n, attrs, opt = {}) ~> @anim.tween n, attrs, {duration: 350} <<< opt
    key = (d) -> d._idx

    pj = join root: @g, tag: \path, cls: \data, data: _parsed, key: key
    # 移除的先縮回 0 再拿掉 ( d3 版的移除會被接著的補間取消, 縮成 0 的 path 一直留著 )
    pj.exit.map (n, i) ~>
      d = n.__data__
      d._removing = true
      d.old <<< d.cur{a,ri,ro}
      d.cur <<<
        a: scale.v(0)
        ri: scale.r(i) + bw/2 - bw/2 * (1 - @cfg.curve.padding)
        ro: scale.r(i) + bw/2 - bw/2 * (1 - @cfg.curve.padding)
      tween n, {d: interpolate-arc(d.old, d.cur, i)}, {remove: true}
    pj.nodes.map (n, i) ~>
      d = n.__data__
      tween n, do
        d: interpolate-arc d.old, d.cur, i
        fill: @tint.get d.name or d._idx

    # 移除後又加回來的 path 會排到最後; 把標籤移到它們後面, 維持標籤疊在 path 上
    Array.from(@g.querySelectorAll ":scope > text.label").map ~> @g.appendChild it
    lj = join root: @g, tag: \text, cls: \label, data: _parsed, key: key
    lj.exit.map (n) ~>
      @anim.interrupt n
      n.remove!
    lj.enter.map (n, i) ->
      d = n.__data__
      n.setAttribute \opacity, 0
      n.setAttribute \y, -scale.r(_parsed.indexOf d)
      n.setAttribute \dy, -bw * 1/4
    lj.nodes.map (n, i) ->
      d = n.__data__
      n.setAttribute \dominant-baseline, \center
      n.setAttribute \text-anchor, \end
      n.setAttribute \x, \-.5em
      n.textContent = d.name
      tween n, {opacity: 1, y: -scale.r(i), dy: -bw * 1/4}

module.exports =
  pkg:
    name: 'curve-bar', version: '0.0.1'
    extend: {name: "base", version: "0.0.1"}
    dependencies: []

  init: ({root, context, pubsub}) ->
    pubsub.fire \init, mod: mod {context}

mod = ({context}) ->
  {d3,legend,chart} = context
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
    @gview = d3.select @layout.get-group \view
    @g = @gview.append \g
    @tint = tint = new chart.utils.tint!
    @parsed = []

    @arc = d3.arc!
      .innerRadius 0
      .outerRadius 100
      .startAngle 0
      .endAngle(Math.PI / 2)

    @legend = new chart.utils.legend do
      root: @root
      name: 'legend'
      shape: (d) -> d3.select(@).attr \fill, tint.get d.text
      layout: @layout
    @legend.on \select, ~> @parse!; @bind!; @resize!; @render!

  parse: ->
    @tint.reset!
    @parsed = @data.map (d,i) ~>
      ret = {_i: i} <<< d
      if !(n = @parsed.filter(-> it._i == i).0) => return ret
      ret <<< n{cur, old}
      return ret

    @extent =
      v: d3.extent @parsed.map -> it.value
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
      v: d3.scaleLinear!domain [0, @extent.v.1] .range [0, Math.PI * 3 / 2]
      r: d3.scaleBand!
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
    @g.attr \transform, "translate(#{box.width / 2},#{box.height / 2})"
    @g.selectAll \path.data .data _parsed, (->it._idx)
      ..exit!each (d,i) ~>
        d._removing = true
        d.old <<< d.cur{a,ri,ro}
        d.cur <<<
          a: scale.v(0)
          ri: scale.r(i) + bw/2 - bw/2 * (1 - @cfg.curve.padding)
          ro: scale.r(i) + bw/2 - bw/2 * (1 - @cfg.curve.padding)
      ..exit!transition!delay 350
        .on \end, (d) -> if d._removing => d3.select(@).remove!
      ..enter!append \path .attr \class, \data
    @g.selectAll \path.data
      .transition!duration 350
      .attrTween \d, (d,i) -> interpolate-arc d.old, d.cur, i
      .attr \fill, (d,i) ~> @tint.get d.name or d._idx
    @g.selectAll \text.label .data _parsed, (->it._idx)
      ..exit!remove!
      ..enter!append \text
        .attr \class, \label
        .attr \opacity, 0
        .attr \y, (d,i) -> -scale.r(i)
        .attr \dy, -bw * 1/4
    @g.selectAll \text.label
      .attr \dominant-baseline, \center
      .attr \text-anchor, \end
      .attr \x, \-.5em
      .text (d,i) -> d.name
      .transition!duration 350
      .attr \opacity, 1
      .attr \y, (d,i) -> -scale.r(i)
      .attr \dy, -bw * 1/4

# curve-bar 的 test case ( @makechart/viewer 的 mctest )
# 每份資料用自己的種子, 跟產生的先後順序無關
mk = (n, seed = n) ->
  rnd = mctest.random seed
  raw: [0 til n].map (i) -> {name: "N#i", val: Math.round(rnd! * 1000) / 10}
  binding: {name: {key: \name}, value: {key: \val}}
# legend.select 不發事件, 照 curve-bar 的 legend select handler 重畫
pick = (names) -> (c) ->
  c.legend.select names
  c.parse!; c.bind!; c.resize!; c.render!

mctest.suite do
  size: [480, 360]
  data:
    few: mk 3
    many: mk 8
  cases:
    * name: "few", data: \few
    * name: "many", data: \many
    * name: "sort:asc", data: \many, config: {sort: \asc}
    * name: "sort:none", data: \many, config: {sort: \none}
    * name: "curve", data: \many, config: {curve: {padding: 0.4, hole: 0.2}}
    * name: "legend:bottom", data: \few, config: {legend: {position: \bottom}}
    * name: "update", data: \few, steps: (c) -> d = mk 5, 9; c.set-raw d.raw, d.binding
    # 拿掉一項: d3 版的移除會被取消, 留下縮成 0 的 path ( lite 版會真的移除 )
    * name: "legend:pick", data: \many, steps: pick <[N0 N2 N3 N5]>
    * name: "legend:repick", data: \many
      steps: [(pick <[N0 N2]>), (pick ["N#i" for i from 0 til 8])]

# lite 版才有: anim 的 manual 時鐘拍動畫中間格
mctest.suite do
  size: [480, 360]
  data: {few: mk 3}
  cases:
    * name: "anim:update-frames", data: \few
      steps: (c, ctx) ->
        d = mk 5, 9
        c.set-raw d.raw, d.binding
        for i from 1 to 4
          c.anim.step 70
          ctx.capture "t#{i * 70}"

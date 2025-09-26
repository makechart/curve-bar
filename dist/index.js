(function(){
  var mod;
  module.exports = {
    pkg: {
      name: 'curve-bar',
      version: '0.0.1',
      extend: {
        name: "base",
        version: "0.0.1"
      },
      dependencies: []
    },
    init: function(arg$){
      var root, context, pubsub;
      root = arg$.root, context = arg$.context, pubsub = arg$.pubsub;
      return pubsub.fire('init', {
        mod: mod({
          context: context
        })
      });
    }
  };
  mod = function(arg$){
    var context, d3, legend, chart, ref$;
    context = arg$.context;
    d3 = context.d3, legend = context.legend, chart = context.chart;
    return {
      sample: function(){
        return {
          raw: [1, 2, 3, 4, 5].map(function(val){
            return {
              val: (10 * Math.random()).toFixed(1),
              name: "N" + val
            };
          }),
          binding: {
            name: {
              key: 'name'
            },
            value: {
              key: 'val'
            }
          }
        };
      },
      config: (ref$ = chart.utils.config.from({
        preset: 'default',
        legend: 'legend'
      }), ref$.sort = {
        type: 'choice',
        values: ['asc', 'desc', 'none'],
        'default': 'desc'
      }, ref$.curve = {
        padding: {
          type: 'number',
          'default': 0.1,
          min: 0,
          max: 1,
          step: 0.01
        },
        hole: {
          type: 'number',
          'default': 0.5,
          min: 0,
          max: 1,
          step: 0.01
        }
      }, ref$),
      dimension: {
        value: {
          type: 'R',
          name: "value"
        },
        name: {
          type: 'N',
          name: "name"
        }
      },
      init: function(){
        var tint, this$ = this;
        this.gview = d3.select(this.layout.getGroup('view'));
        this.g = this.gview.append('g');
        this.tint = tint = new chart.utils.tint();
        this.parsed = [];
        this.arc = d3.arc().innerRadius(0).outerRadius(100).startAngle(0).endAngle(Math.PI / 2);
        this.legend = new chart.utils.legend({
          root: this.root,
          name: 'legend',
          shape: function(d){
            return d3.select(this).attr('fill', tint.get(d.text));
          },
          layout: this.layout
        });
        return this.legend.on('select', function(){
          this$.parse();
          this$.bind();
          this$.resize();
          return this$.render();
        });
      },
      parse: function(){
        var this$ = this;
        this.tint.reset();
        this.parsed = this.data.map(function(d, i){
          var ret, n;
          ret = import$({
            _i: i
          }, d);
          if (!(n = this$.parsed.filter(function(it){
            return it._i === i;
          })[0])) {
            return ret;
          }
          ret.cur = n.cur;
          ret.old = n.old;
          return ret;
        });
        this.extent = {
          v: d3.extent(this.parsed.map(function(it){
            return it.value;
          }))
        };
        return this.legend.data(this.parsed.map(function(it){
          return {
            key: it.name,
            text: it.name
          };
        }));
      },
      resize: function(){
        var box, ref$, w, h, size, this$ = this;
        this.root.querySelector('.pdl-layout').classList.toggle('legend-bottom', this.cfg.legend.position === 'bottom');
        this.legend.config(import$({}, this.cfg.legend));
        this.legend.update();
        this.layout.update(false);
        this.parsed.sort(function(a, b){
          if (this$.cfg.sort === 'asc') {
            return b.value - a.value;
          } else if (this$.cfg.sort === 'desc') {
            return a.value - b.value;
          } else {
            return a._idx - b._idx;
          }
        });
        box = this.layout.getBox('view');
        this.layout.getNode('view').style.width = box.height + "px";
        this.layout.update(false);
        box = this.layout.getBox('view');
        ref$ = [box.width, box.height], w = ref$[0], h = ref$[1];
        size = Math.min(w, h);
        return this.scale = {
          v: d3.scaleLinear().domain([0, this.extent.v[1]]).range([0, Math.PI * 3 / 2]),
          r: d3.scaleBand().domain(this.parsed.filter(function(it){
            return !it._removing;
          }).map(function(d, i){
            return i;
          })).range([this.cfg.curve.hole * size / 2, size / 2])
        };
      },
      render: function(){
        var scale, bw, _parsed, interpolateArc, box, x$, y$, this$ = this;
        scale = this.scale;
        bw = this.scale.r.bandwidth();
        this.arc.cornerRadius(bw / 2);
        if (this.cfg != null && this.cfg.palette) {
          this.tint.set(this.cfg.palette.colors.map(function(it){
            return it.value || it;
          }));
        }
        this.legend.render();
        _parsed = this.parsed.filter(function(it){
          return this$.legend.isSelected(it.name);
        });
        _parsed.map(function(d, i){
          d.old = d.cur || {
            a: 0,
            ri: scale.r(i) + bw / 2,
            ro: scale.r(i) + bw / 2
          };
          return d.cur = {
            a: scale.v(d.value),
            ri: scale.r(i) + bw / 2 - bw / 2 * (1 - this$.cfg.curve.padding),
            ro: scale.r(i) + bw / 2 + bw / 2 * (1 - this$.cfg.curve.padding)
          };
        });
        interpolateArc = function(a1, a2, i){
          return function(t){
            this$.arc.startAngle(0).endAngle((a2.a - a1.a) * t + a1.a).innerRadius((a2.ri - a1.ri) * t + a1.ri).outerRadius((a2.ro - a1.ro) * t + a1.ro);
            return this$.arc();
          };
        };
        box = this.layout.getBox('view');
        this.g.attr('transform', "translate(" + box.width / 2 + "," + box.height / 2 + ")");
        x$ = this.g.selectAll('path.data').data(_parsed, function(it){
          return it._idx;
        });
        x$.exit().each(function(d, i){
          var ref$, ref1$;
          d._removing = true;
          ref1$ = d.old;
          ref1$.a = (ref$ = d.cur).a;
          ref1$.ri = ref$.ri;
          ref1$.ro = ref$.ro;
          return ref1$ = d.cur, ref1$.a = scale.v(0), ref1$.ri = scale.r(i) + bw / 2 - bw / 2 * (1 - this$.cfg.curve.padding), ref1$.ro = scale.r(i) + bw / 2 - bw / 2 * (1 - this$.cfg.curve.padding), ref1$;
        });
        x$.exit().transition().delay(350).on('end', function(d){
          if (d._removing) {
            return d3.select(this).remove();
          }
        });
        x$.enter().append('path').attr('class', 'data');
        this.g.selectAll('path.data').transition().duration(350).attrTween('d', function(d, i){
          return interpolateArc(d.old, d.cur, i);
        }).attr('fill', function(d, i){
          return this$.tint.get(d.name) || d._idx;
        });
        y$ = this.g.selectAll('text.label').data(_parsed, function(it){
          return it._idx;
        });
        y$.exit().remove();
        y$.enter().append('text').attr('class', 'label').attr('opacity', 0).attr('y', function(d, i){
          return -scale.r(i);
        }).attr('dy', -bw * 1 / 4);
        return this.g.selectAll('text.label').attr('dominant-baseline', 'center').attr('text-anchor', 'end').attr('x', '-.5em').text(function(d, i){
          return d.name;
        }).transition().duration(350).attr('opacity', 1).attr('y', function(d, i){
          return -scale.r(i);
        }).attr('dy', -bw * 1 / 4);
      }
    };
  };
  function import$(obj, src){
    var own = {}.hasOwnProperty;
    for (var key in src) if (own.call(src, key)) obj[key] = src[key];
    return obj;
  }
}).call(this);

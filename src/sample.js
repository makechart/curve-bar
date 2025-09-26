
{
  sample: function() {
    var list = d3.range(Math.round(Math.random() * 3 + 4));
    var value = [{name: "Amount", data: list.map(function() { return Math.random(); })}];
    var name = [{name: "Fruit", data: list.map(function(it) {
      return plotdb.data.sample.fruit[it % plotdb.data.sample.fruit.length]
    })}];
    return {name: name, value: value};
  },
  dimension: {
    value: { type: [plotdb.Number], require: true, desc: "size of pie" },
    name: { type: [], require: false, desc: "name of pie" },
  },
  config: {
    fontFamily: {},
    background: {},
    textFill: {},
    fontSize: {},
    margin: {},
    palette: {},
    stroke: {default: "#fff"},
    strokeWidth: {},
    thick: { name: "thick (0~1)", type: [plotdb.Number], default: 1 },
    boxRoundness: {},
    labelShow: {},
    labelShadowSize: {},
    otherLimit: {},
    otherLabel: {},
    labelPosition: {},
    legendLabel: {},
    legendShow: {},
    legendPosition: {},
    legendInline: {
      name: "Show Inline Legend",
      type: [plotdb.Boolean],
      default: false,
      desc: "[Experiment feature] Show legend with wedges instead of a standalone legend panel",
      category: "Legend Inline"
    },
    legendInlineColor: {
      name: "Color",
      type: [plotdb.Color],
      default: "#222",
      desc: "Dot / Line Color",
      category: "Legend Inline"
    },
    legendInlineStrokeWidth: {
      name: "Stroke Width",
      type: [plotdb.Number],
      default: 2,
      desc: "Dot / line width of inline legend",
      category: "Legend Inline"
    },
    unit: {},
    sort: { name: "Sort Values", type: [plotdb.Boolean], default: true, rebindOnChange: true },
    showPercent: {name: "Show Percent", type: [plotdb.Boolean], default: false},
    popupShow: {}
  },

  init: function() {
    var that = this;
    this.svg = d3.select(this.root).append("svg");
    this.pieGroup = this.svg.append("g").attr("class", "pie-group");
    this.legendGroup = this.svg.append("g").attr({"class": "legend-group"});
    this.popup = plotd3.html.tooltip(this.root).on("mousemove", function(d,i,popup) {
      popup.select(".title").text(d.data.name || "-");
      popup.select(".value").html([
        Math.ceil(100 * d.data.value)/100 + (that.config.unit || ""),
        d.data.percent
      ].join("<br>"));
    });
    this.popup.coord(function(d,i) {
      var r = d.data.centralRadius;
      var a = (d.endAngle + d.startAngle)/2;
      var x = Math.sin(a) * r;
      var y = -Math.cos(a) * r;
      var cx = (that.width - that.legendOffset[0] * (that.config.legendPosition == "right" ? 1 : -1 )) / 2;
      var cy = (that.height - that.legendOffset[1] * (that.config.legendPosition == "bottom" ? 1 : -1 )) / 2;
      return [
        cx + x, cy + y, 1,1
      ];
    });
    this.pielayout = d3.layout.pie().value(function(it) { return it.value; });
  },
  parse: function() {
    if(!this.dimension.name.fields.length) this.data.map(function(d,i) { d.name = i; });
    if(!this.dimension.value.fields.length) this.data.map(function(d,i) { d.value= 1; });
    this.names = d3.map(this.data, function(d,i) { return d.name || ""; }).keys();
  },
  bind: function() {
    var that = this, sel, sel1, sel2;
    sel = this.pieGroup.selectAll("path.data.pie").data(this.parsed);
    sel.exit().attr({class: ""}).transition("exit").duration(500).attr({opacity: 0}).remove();
    sel1 = sel.enter().append("path").attr({class: "data pie", opacity: 0});
    sel = this.pieGroup.selectAll("g.label").data(this.parsed);
    sel.exit().attr({class: ""}).transition("exit").duration(500).attr({opacity: 0}).remove();
    sel2 = sel.enter().append("g").attr({class: "label", opacity: 0});
    this.pieGroup.selectAll("g.label").each(function(d,i) {
      var node = d3.select(this),sel;
      sel = node.selectAll("text").data([d,d]);
      sel.exit().remove();
      sel.enter().append("text").attr({
        class: function(d,i) { return "data label " + (i ? "value" : "shadow"); },
      });
    });
    sel = this.pieGroup.selectAll("g.marker").data(this.parsed);
    sel.exit().remove();
    sel.enter().append("g").attr({class: "marker"}).each(function(d,i) {
      var node = d3.select(this);
      node.append("path"); node.append("circle"); node.append("circle"); node.append("text");
    });
    this.pieGroup.selectAll("g.marker").each(function(d,i) {
      var node = d3.select(this);
      node.select("path").datum(d);node.selectAll("circle").data([d,d]);node.select("text").datum(d);
    });
    if(this.config.popupShow) this.popup.nodes(sel1).nodes(sel2);
    [sel1,sel2].map(function(sel) {
      sel.on("click", function(d,i) {
        that.fire("filter", {type: "value", value: d.data.name, field: "name"});
      });
    });
  },
  resize: function() {
    var that = this;
    var other = {
      name: that.config.otherLabel,
      value: this.data.filter(function(d,i) { return d.value < that.config.otherLimit; }).reduce(function(a,b) { return a + b.value; }, 0)
    };
    this.fdata = this.data.filter(function(d,i) { return d.value >= that.config.otherLimit; });
    if(other.value != 0) this.fdata.push(other);
    this.names = this.fdata.map(function(it) { return it.name; });

    var box = this.root.getBoundingClientRect();
    var svgbox = this.svg[0][0].getBoundingClientRect();
    var width = this.width = box.width;
    var height = this.height = box.height;
    this.svg.attr({
      width: width + "px", height: height + "px",
      viewBox: [0,0,width,height].join(" "),
      preserveAspectRatio: "xMidYMid"
    });
    this.popup.fontSize(this.config.fontSize);
    this.legendVertical = ["right","left"].indexOf(this.config.legendPosition) >= 0;
    this.cScale = plotdb.Palette.scale.ordinal(this.config.palette);
    this.legend = plotd3.rwd.legend()
      .size(this.legendVertical ? [220, this.height - 2 * this.config.margin] : [this.width - 2 * this.config.margin, 220])
      .orient(this.config.legendPosition).scale(this.cScale)
      .label(this.config.legendLabel || "")
      .tickValues(this.names).fontSize(this.config.fontSize);
    this.legendGroup.call(this.legend);
    this.legendGroup.selectAll(".legend").on("mouseover", function(d,i) {
      that.activeGroup = d; that.render();
    }).on("mouseout", function(d,i) {
      that.activeGroup = null; that.render();
    });
    this.legendSize = (this.config.legendShow ? this.legend.offset() : [0,0]);
    this.legendOffset = this.config.legendShow ?
      this.legendVertical ? [this.legendSize[0] + this.config.fontSize,0] : [0, this.legendSize[1] + this.config.fontSize]
    : [0,0];
    var w = this.width - this.legendOffset[0];
    var h = this.height - this.legendOffset[1] - (this.config.legendInline ? 60 : 0);
    this.radius = ( w > h ? h : w )/2 - this.config.margin
      - (!that.config.labelShow || (that.config.labelPosition == 'in') ? 0 : 2 * that.config.fontSize);
    this.pielayout.sort(this.config.sort ? function(a,b) { return b.value - a.value; } : null);
    var parsed = this.pielayout(this.fdata);
    this.parsed = parsed;
    var sum = d3.sum(this.fdata, function(d,i) { return d.value; });
    parsed.map(function(d,i) {
      var a = (d.startAngle + d.endAngle ) / 2;
      var r = that.radius;
      if(that.config.labelPosition != 'in') r += that.config.fontSize * 2;
      else r = (that.radius + that.radius * 0.9 * (1 - that.config.thick/2))/2;
      if(!d.data.parsed) d.data.parsed = d;
      d.data.width = (d.endAngle - d.startAngle) * r;
      d.data.centralRadius = r;
      d.data.innerRadius = that.radius * 0.9 * (1 - that.config.thick/2);
      d.data.x = Math.sin(a) * r;
      d.data.y = -Math.cos(a) * r;
      d.data.startAngle = d.startAngle;
      d.data.endAngle = d.endAngle;
      d.data.padAngle = d.padAngle;
      d.data.percent = (parseInt(1000 * d.data.value / sum) / 10) + "%";
    });
    if(this.config.sort) {
      this.parsed.sort(function(a,b) { return b.data.value - a.data.value; });
    } else {
      this.parsed.sort(function(a,b) { return parseInt(Math.random() * 2 - 1); });
    }
    if(this.config.thick>1) this.config.thick = 1;
    if(this.config.thick<0) this.config.thick = 0;
    this.arc = d3.svg.arc()
      .innerRadius(function(d,i) { return d.data.innerRadius; })
      .outerRadius(this.radius)
      .cornerRadius(this.config.boxRoundness);
  },
  render: function() {
    var that = this;
    if(this.config.fontFamily) d3.select(this.root).style("font-family", this.config.fontFamily);
    d3.select(this.root).style("background-color", this.config.background);
    this.svg.selectAll("g.label text, .legend text, g.marker text").attr({
      "font-size": that.config.fontSize,
      "fill": that.config.textFill
    });
    (this.pieGroup.attr("transform")
      ? this.pieGroup.transition("morph").duration(500)
      : this.pieGroup
    ).attr({
      transform: [
        "translate(",
        (that.width - this.legendOffset[0] * (this.config.legendPosition == "right" ? 1 : -1 )) / 2,
        (that.height - this.legendOffset[1] * (this.config.legendPosition == "bottom" ? 1 : -1 )) / 2,
        ")"
      ].join(" ")
    });
    this.pieGroup.selectAll("path.data.pie").attr({
      fill: function(d,i) {
        return that.cScale(d.data.name);
      },
      stroke: this.config.stroke,
      "stroke-width": this.config.strokeWidth
    }).transition("opacity").duration(500).attr({
      opacity: function(d,i) {
        return (!that.activeGroup || that.activeGroup == d.data.name ? 1 : 0.1);
      }
    });
    this.pieGroup.selectAll("path.data.pie").transition("morph").duration(500).tween("morph", function(d,i) {
      var oldAngles = (
        this.lastAngles || [d.startAngle,d.startAngle,d.data.innerRadius, d.data.innerRadius]
      );
      var curAngles = [d.startAngle, d.endAngle, that.radius, d.data.innerRadius];
      var node = d3.select(this);
      this.lastAngles = curAngles;
      return function(t) {
        node.attr({
          d: that.arc
            .startAngle((curAngles[0] - oldAngles[0]) * t + oldAngles[0])
            .endAngle((curAngles[1] - oldAngles[1]) * t + oldAngles[1])
            .outerRadius((curAngles[2] - oldAngles[2]) * t + oldAngles[2])
            .innerRadius((curAngles[3] - oldAngles[3]) * t + oldAngles[3])
        });
      };
    });
    var labels = this.pieGroup.selectAll("g.label");
    labels.filter(function(d,i) { return !d3.select(this).attr("transform"); }).attr({
      transform: function(d,i) {
        return ["translate(", d.data.x, d.data.y,")"].join(" ");
      }
    });
    labels.each(function(d,i) {
      var node = d3.select(this);
      node.selectAll("text").attr({
        fill: function(d,i) {
          var c = d3.hsl(that.cScale(d.data.name));
          return (c.l > 0.6 || (that.config.labelPosition != 'in') ? "#000":"#fff");
        },
        "font-size": that.config.fontSize,
        "text-anchor": "middle",
        dy: "0.38em"
      }).style({
        display: (that.config.labelShow?"block":"none")
      }).text(function(d,i) {
        return (that.config.showPercent ? d.data.percent : parseInt(100*d.data.value)/100);
      });
      node.select("text.label.shadow").attr({
        stroke: function(d,i) {
          var c = d3.hsl(that.cScale(d.data.name));
          return (c.l > 0.6 || that.config.labelPosition != 'in' ? "#fff":"#000");
        },
        "stroke-width": that.config.labelShadowSize,
      }).style({
        display: (that.config.labelShadowSize && that.config.labelShow ? "block" : "none")
      });
      if(that.config.fontSize * 2 > d.data.width * 1.5) {
        node.selectAll("text").style({display: "none"});
      }
    })
    labels.transition("move").duration(500).attr({
      transform: function(d,i) {
        return ["translate(", d.data.x, d.data.y,")"].join(" ");
      }
    });
    labels.transition("opacity").duration(500).attr({opacity: 1});
    this.pieGroup.selectAll("g.marker").attr({
      display: (this.config.legendInline ? "block" : "none")
    }).each(function(d,i) {
      var node = d3.select(this);
      var x1, y1, x2, y2, xm, ym;
      var a = (d.startAngle + d.endAngle)/2;
      x1 = Math.sin(a) * that.radius;
      y1 = -Math.cos(a) * that.radius;
      x2 = x1 + (x1 < 0 ? -100 : 100);
      y2 = y1 + (y1 < 0 ? -20 : 20);
      if(Math.abs(x1) < Math.abs(y1)) {
        xm = x1 + (x1 < 0 ? -20 : 20);
        ym = y2;      
      } else {
        xm = x2 + (x1 < 0 ? 20 : -20);
        ym = y1;
      }
      node.select("circle").attr({
        cx: x1, cy: y1, fill: that.config.legendInlineColor,
        r: that.config.legendInlineStrokeWidth * 1.5
      });
      node.select("circle:last-of-type").attr({
        cx: x2, cy: y2, fill: that.config.legendInlineColor,
        r: that.config.legendInlineStrokeWidth * 1.5
      });
      node.select("path").attr({
        d: function() {
          return [
            "M", x1, y1, 
            "L", xm, ym,
            "L", x2, y2
          ].join(" ");
        },
        fill: "none",
        stroke: that.config.legendInlineColor,
        "stroke-width": that.config.legendInlineStrokeWidth
      });
      node.select("text").attr({
        x: x2, y: y2,
        dy: "0.38em",
        dx: (x1<0?-0.5:0.5) + "em",
        "text-anchor": (x1<0?"end": "start")
      }).text(d.data.name);
    });
    var minus = ["left","top"].indexOf(this.config.legendPosition) >= 0;
    var offset = (this.legendVertical
      ? [this.width/2 + (this.radius + this.config.fontSize/2 - (minus?-1:1)*this.legendSize[0]/2) * (minus ? -1 : 1),(this.height - this.legendSize[1])/2]
      : [(this.width - this.legendSize[0])/2,this.height/2 + (this.radius + this.config.fontSize + (!minus?-this.legendSize[1]:0)) * (minus?-1:1)]
    );
    this.legendGroup.attr({
      transform: ["translate(",offset[0], offset[1], ")"].join(" "),
      display: this.config.legendShow ? "block" : "none"
    });
  }
}

/*
Author: Lian
20171227
*/

var docBody = document.getElementsByTagName('body')[0],
    width = (window.innerWidth || document.documentElement.clientWidth || docBody.clientWidth) - 10,
    height = (window.innerHeight || document.documentElement.clientHeight || docBody.clientHeight) - 20;
var GetWidth = Number(findGetParameter("width")),
    GetHeight = Number(findGetParameter("height"));

if(GetWidth > 0) width = GetWidth;
if(GetHeight > 0) height = GetHeight;

var svg = d3.select("body").append("svg");

window.addEventListener("resize", resize);

var diameter = Math.min(width, height) - 200,
    radius = diameter > 400 ? diameter / 2 - 50 : 150,
    innerRadius = radius > 1000 ? radius - 8 * getFontSize(radius) : radius;

var cluster = d3.cluster()
    .size([360, innerRadius]);

var line = d3.radialLine()
    .curve(d3.curveBundle.beta(0.75))
    .radius(function(d) { return d.y; })
    .angle(function(d) { return d.x / 180 * Math.PI; });

var g = svg.append("g");

var zoom = d3.zoom()
      .scaleExtent([1 / 4, 5])
      .on("zoom", function() {g.attr("transform", d3.event.transform);})
      .filter(function() { return !event.button && event.type !== 'click'; });

var zoomer = svg.call(zoom).on("dblclick.zoom", null)
      .call(zoom.transform, d3.zoomIdentity.translate(width/2, height/2));

var link = g.selectAll(".link"),
    node = g.selectAll(".node");

var legendHeight = 10 + radius/100,
    legend = svg.selectAll('.legend')
    .data(["TX", "RX", "Dual"])
    .enter().append('g')
    .attr("class", "legends")
    .attr("transform", function (d, i) {
        return "translate(0," + (10 + i * 2 * legendHeight) + ")"
    });

legend.append('rect')
    .attr("x", 10)
    .attr("y", 10)
    .attr("width", legendHeight)
    .attr("height", legendHeight)
    .classed("node--source", function(d,i) { if (i == 0) return true; })
    .classed("node--target", function(d,i) { if (i == 1) return true; })
    .classed("node--dual", function(d,i) { if (i == 2) return true; });

legend.append('text')
    .attr("x", 10 + 2 * legendHeight)
    .attr("y", 10 + legendHeight)
    .text(function (d, i) {
        return d
    })
    .attr("class", "textselected")
    .style("text-anchor", "start")
    .style("font-size", getFontSize(radius));

resize();

d3.json("json/" + findGetParameter("input"), function(error, classes) {
  if (error) throw error;

  var root = packageHierarchy(classes)
      .sum(function(d) { return d.size; });

  cluster(root);

  link = link
    .data(packageImports(root.leaves()))
    .enter().append("path")
      .each(function(d) { d.source = d[0], d.target = d[d.length - 1]; })
      .attr("class", "link")
      .attr("d", line);

  node = node
    .data(root.leaves())
    .enter().append("text")
      .attr("class", "node")
      .style("font-size",getFontSize(radius)+"px")
      .attr("dy", "0.31em")
      .attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + (d.y + 8) + ",0)" + (d.x < 180 ? "" : "rotate(180)"); })
      .attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
      .text(function(d) { return d.data.key; })
      .on("mouseover", mouseovered)
      .on("mouseout", mouseouted)
      .on("click", mousereleased);
});

function mouseovered(d) {
  node
    .each(function(n) { n.target = n.source = false; });

  link
    .filter(function(l) { return l.target === d || l.source === d; })
    .classed("link--rx", function(l) { if (l.target === d) return l.source.source = true; })
    .classed("link--tx", function(l) { if (l.source === d) return l.target.target = true; })
    .classed("link--dual", function(l) {
      if ((l.source === d && l.target.source) || (l.target === d && l.source.target)) return true;
    });

  node
      .classed("node--target", function(n) { if(n.target && !n.source) return n.target; })
      .classed("node--source", function(n) { if(n.source && !n.target) return n.source; })
      .classed("node--dual", function(n) { if(n.target && n.source) return n.source; });
}

function mouseouted(d) {
  link
      .classed("link--rx", false)
      .classed("link--tx", false)
      .classed("link--dual", false);

  node
      .classed("node--target", false)
      .classed("node--source", false)
      .classed("node--dual", false);
}

function mousereleased(d) {
  if (findGetParameter("input").split(".")[0] === "ipflowdemo"){
    var tmp = d.data.name.split("\\");
    var ip = tmp[tmp.length - 1];
    var url = "force-directed-test.html?input=ipflowdemo." + encodeURIComponent(btoa(ip)) + ".force-directed.json";
    window.location.href = url;
  }
}

d3.select(self.frameElement).style("height", diameter + "px");

// Lazily construct the package hierarchy from class names.
function packageHierarchy(classes) {
  var map = {};

  function find(name, data) {
    var node = map[name], i;
    if (!node) {
      node = map[name] = data || {name: name, children: []};
      if (name.length) {
        node.parent = find(name.substring(0, i = name.lastIndexOf("\\")));
        node.parent.children.push(node);
        node.key = name.substring(i + 1);
      }
    }
    return node;
  }

  classes.forEach(function(d) {
    find(d.name, d);
  });

  return d3.hierarchy(map[""]);
}

// Return a list of imports for the given array of nodes.
function packageImports(nodes) {
  var map = {},
      imports = [];

  // Compute a map from name to node.
  nodes.forEach(function(d) {
    map[d.data.name] = d;
  });

  // For each import, construct a link from the source to target node.
  nodes.forEach(function(d) {
    if (d.data.imports) d.data.imports.forEach(function(i) {
      imports.push(map[d.data.name].path(map[i]));
    });
  });

  return imports;
}

function findGetParameter(parameterName) {
    var result = null, tmp = [];
    location.search
      .substr(1)
      .split("&")
      .forEach(function (item) {
        tmp = item.split("=");
        if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
      });
    return result;
}

// get width of container and resize svg to fit it
function resize() {
  var docBody = document.getElementsByTagName('body')[0],
      width = (window.innerWidth || document.documentElement.clientWidth || docBody.clientWidth) - 10,
      height = (window.innerHeight || document.documentElement.clientHeight || docBody.clientHeight) - 20;
  var GetWidth = Number(findGetParameter("width")),
      GetHeight = Number(findGetParameter("height"));

  if(GetWidth > 0) width = GetWidth;
  if(GetHeight > 0) height = GetHeight;
  
  svg.attr("viewBox", "0 0 " + width + " " + height)
    .attr("preserveAspectRatio", "xMinYMid")
    .call(zoom.transform, d3.zoomIdentity.translate(width/2, height/2));
}

function getFontSize(radius) {
  return Math.round(10 + Math.log1p(radius) + (radius > 1000 ? radius*radius / 50000 : radius / 200 ));
}

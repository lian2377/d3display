var docBody = document.getElementsByTagName('body')[0],
  width = (window.innerWidth || document.documentElement.clientWidth || docBody.clientWidth) - 10,
  height = (window.innerHeight || document.documentElement.clientHeight || docBody.clientHeight) - 10;

var GetWidth = Number(findGetParameter("width")),
  GetHeight = Number(findGetParameter("height"));

if(GetWidth > 0){
  width = GetWidth;
}
if(GetHeight){
  height = GetHeight;
}

var diameter = Math.min(width, height) - 200,
  radius = diameter / 2,
  innerRadius = radius - 120;

var cluster = d3.layout.cluster()
  .size([360, innerRadius])
  .sort(null)
  .value(function(d) { return d.size; });

var bundle = d3.layout.bundle();

var line = d3.svg.line.radial()
  .interpolate("bundle")
  .tension(.85)
  .radius(function(d) { return d.y; })
  .angle(function(d) { return d.x / 180 * Math.PI; });

var svg = d3.select("body").append("svg")
  .attr("width", width)
  .attr("height", height)
  .append("g")
  .attr("transform", "translate(" + width/2 + "," + height/2 + ")");

var link = svg.append("g").selectAll(".link"),
  node = svg.append("g").selectAll(".node");

d3.json("json/" + findGetParameter("input"), function(error, classes) {
  if (error) throw error;

  var nodes = cluster.nodes(packageHierarchy(classes)),
    links = packageImports(nodes);

  link = link
    .data(bundle(links))
    .enter().append("path")
    .each(function(d) { d.source = d[0], d.target = d[d.length - 1]; })
    .attr("class", "link")
    .attr("d", line);

  node = node
    .data(nodes.filter(function(n) { return !n.children; }))
    .enter().append("text")
    .attr("class", "node")
    .attr("dy", ".31em")
    .attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + (d.y + 8) + ",0)" + (d.x < 180 ? "" : "rotate(180)"); })
    .style("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
    .text(function(d) { return d.key; })
    .on("mouseover", mouseovered)
    .on("mouseout", mouseouted)
    .on("mouseup", mousereleased);
      
});

function mouseovered(d) {
  node
    .each(function(n) { n.target = n.source = false; });

  link
    .classed("link--target", function(l) { if (l.target === d) return l.source.source = true; })
    .classed("link--source", function(l) { if (l.source === d) return l.target.target = true; })
    .filter(function(l) { return l.target === d || l.source === d; })
    .each(function() { this.parentNode.appendChild(this); });

  node
    .classed("node--target", function(n) { return n.target; })
    .classed("node--source", function(n) { return n.source; });
}

function mouseouted(d) {
  link
    .classed("link--target", false)
    .classed("link--source", false);

  node
    .classed("node--target", false)
    .classed("node--source", false);
}

function mousereleased(d) {
  if (findGetParameter("input").split(".")[0] === "ipflowdemo"){
    var tmp = d.name.split("."), intIP = 0;
    if (tmp[0].search("\\\\") != -1){
      tmp[0] = tmp[0].split("\\")[1]
    }
    tmp.forEach(function(item, index, array) {
      intIP *= 256;
      intIP += parseInt(item);
    });
    var url = "force-directed.html?input=ipflowdemo." + intIP + ".force-directed.json";
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

  return map[""];
}

// Return a list of imports for the given array of nodes.
function packageImports(nodes) {
  var map = {},
    imports = [];

  // Compute a map from name to node.
  nodes.forEach(function(d) {
    map[d.name] = d;
  });

  // For each import, construct a link from the source to target node.
  nodes.forEach(function(d) {
    if (d.imports) d.imports.forEach(function(i) {
      imports.push({source: map[d.name], target: map[i]});
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

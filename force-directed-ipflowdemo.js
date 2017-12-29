/*
force-directed-ipflowdemo.js
Author: Lian
20171228
*/

var docBody = document.getElementsByTagName('body')[0],
  width = (window.innerWidth || document.documentElement.clientWidth || docBody.clientWidth) - 20,
  height = (window.innerHeight || document.documentElement.clientHeight|| docBody.clientHeight) - 20;

var svg = d3.select("svg")
  .attr("width", width)
  .attr("height", height);

svg.append("rect")
  .attr("width", width)
  .attr("height", height)
  .style("fill", "none")
  .style("pointer-events", "all")
  .call(d3.zoom()
    .scaleExtent([1 / 16, 5])
    .on("zoom", zoomed));

var g = svg.append("g");

function zoomed() {
  g.attr("transform", d3.event.transform);
}

var color = d3.scaleOrdinal(d3.schemeCategory20);

// Init force simulation
var force = 0;
var simulation = d3.forceSimulation()
  .force("link", d3.forceLink().distance(80).id(function(d) {
    return d.id;
  }))
  .force("charge", d3.forceManyBody().strength(force))
  .force("center", d3.forceCenter(width / 2, height / 2));

// Parse source ip
var observeIP = atob(findGetParameter("input").split(".")[1]);

// Parse json input file and draw
d3.json("json/"+findGetParameter("input"), function(error, graph) {
  if (error) throw error;

  // Setup link data
  var link = g.append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(graph.links)
    .enter().append("line")
    .attr("stroke-width", function(d) {
      return Math.sqrt(d.value/100)+1;
    });

  // Setup text
  var text = g.append("g")
    .attr("class", "text")
    .selectAll("text")
    .data(graph.nodes)
    .enter().append("text")
    .text(function(d) {
      return d.id;
    });
    
  // Setup node data
  var node = g.append("g")
    .attr("class", "nodes")
    .selectAll("circle")
    .data(graph.nodes)
    .enter().append("circle")
    .attr("r", 8)
    .attr("fx", function(d) { return d.fx = width * (1 - d.group * 0.2) / 2; })
    .attr("fy", function(d) { if (d.id === observeIP) return d.fy = height / 2; })
    .attr("fill", function(d) {
      return color(d.group);
    })
    .on("click", mousereleased)
    .call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended));

  // Registering nodes to the force simulation and the function ticked()
  simulation
    .nodes(graph.nodes)
    .on("tick", ticked);

  simulation.force("link")
    .links(graph.links);

  var legendData = new Array(graph.nodes[0].group+1);
  for (i = 0; i < legendData.length; i++) { 
    if (i == 0) legendData[i] = "Source";
    else legendData[i] = "Level " + i;
  }

  var legendHeight = 10 + height/100,
      legend = svg.selectAll('.legend')
      .data(legendData.reverse())
      .enter().append('g')
      .attr("class", "legends")
      .attr("transform", function (d, i) {
          return "translate(0," + (10 + i * 2 * legendHeight) + ")"
      });

  legend.append('circle')
      .attr("cx", 10 + legendHeight)
      .attr("cy", 5 + legendHeight)
      .attr("r", legendHeight/2)
      .style("fill", function(d,i) { return color(i); });

  legend.append('text')
      .attr("x", 10 + 2 * legendHeight)
      .attr("y", 10 + legendHeight)
      .text(function (d, i) {
          return d
      })
      .attr("class", "textselected")
      .style("text-anchor", "start")
      .style("font-size", "11px");

  setTimeout(function(){ loose(node); }, 200);

  function ticked() {
    link
      .attr("x1", function(d) {
        return d.source.x;
      })
      .attr("y1", function(d) {
        return d.source.y;
      })
      .attr("x2", function(d) {
        return d.target.x;
      })
      .attr("y2", function(d) {
        return d.target.y;
      });

    node
      .attr("cx", function(d) {
        return d.x;
      })
      .attr("cy", function(d) {
        return d.y;
      });
      
    text
      .attr("x", function(d) {
        return d.x + 8;
      })
      .attr("y", function(d) {
        return d.y + 5;
      });
  }
});

// Handle drag event
function dragstarted(d) {
  if (!d3.event.active) simulation.alphaTarget(0.4).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(d) {
  d.fx = d3.event.x;
  d.fy = d3.event.y;
}

function dragended(d) {
  if (!d3.event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
  // Uncomment it if you need a fixed source node.
  if (d.id === observeIP) d.fx = width * 0.2;
}

function mousereleased(d) {
  var url = "http://[Domain]/grant/connect/" + btoa(d.id);
  console.log(url);
  //window.location.href = url;
}

// Make nodes loose over time
function loose(node){
  var bStop = true;
  if (force > -1000){
    force -= 50;
    bStop = false;
  }
  simulation.force("charge", d3.forceManyBody().strength(force)).alpha(0.3).restart();
  node
    .attr("fx", function(d) { 
      if (d.id === observeIP && node.size() > 5)
        return d.fx = width * 0.2;
      return d.fx = null;
    })
    .attr("fy", function(d) { if (d.id !== observeIP) return d.fy = null; })
  if (!bStop) setTimeout(function(){ loose(node); }, 50);
}

// Return specified GET parameter
function findGetParameter(parameterName) {
  var result = null,
      tmp = [];
  location.search
  .substr(1)
      .split("&")
      .forEach(function (item) {
      tmp = item.split("=");
      if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
  });
  return result;
}
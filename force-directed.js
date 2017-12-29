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

var simulation = d3.forceSimulation()
  .force("link", d3.forceLink().distance(80).id(function(d) {
    return d.id;
  }))
  .force("charge", d3.forceManyBody().strength(-1000))
  .force("center", d3.forceCenter(width / 2, height / 2));

d3.json("json/"+findGetParameter("input"), function(error, graph) {
  if (error) throw error;

  var link = g.append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(graph.links)
    .enter().append("line")
    .attr("stroke-width", function(d) {
      return Math.sqrt(d.value/100)+1;
    });

  var text = g.append("g")
    .attr("class", "text")
    .selectAll("text")
    .data(graph.nodes)
    .enter().append("text")
    .text(function(d) {
      return d.id;
    });
    
  var node = g.append("g")
    .attr("class", "nodes")
    .selectAll("circle")
    .data(graph.nodes)
    .enter().append("circle")
    .attr("r", 8)
    .attr("fill", function(d) {
      return color(d.group);
    })
    .on("click", mousereleased)
    .call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended));

  simulation
    .nodes(graph.nodes)
    .on("tick", ticked);

  simulation.force("link")
    .links(graph.links);

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
}

function mousereleased(d) {
  var url = "http://[Domain]/grant/connect/" + btoa(d.id);
  console.log(url);
  //window.location.href = url;
}

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
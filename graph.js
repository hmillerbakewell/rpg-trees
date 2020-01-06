let textToGraph = function (text) {
    let nodes = [{ id: "Start", cost: 0 }]
    let edges = []

    let byName = function (name) {
        for (var j = 0; j < nodes.length; j++) {
            if (nodes[j].id.toLowerCase() == name.toLowerCase()) { return nodes[j] }
        }
    }

    let lineToJSON = function (l) {
        if (l.length == 0) {
            return
        }
        let parts = l.split("needs")
        let name = parts[0].trim()
        nodes.push({
            id: name
        })
        if (parts.length > 1) {
            let dependencies = parts[1].split(",")
            for (var j = 0; j < dependencies.length; j++) {
                let d = dependencies[j].trim()
                let minSpend = 1
                if (d[0].match(/\d/)) {
                    let words = d.split(" ")
                    minSpend = parseInt(words.shift())
                    d = words.join(" ")
                }

                edges.push({
                    source: byName(d).id,
                    target: name,
                    minSpend: minSpend
                })
            }
        } else {
            edges.push({
                source: "Start",
                target: name,
                minSpend: 1
            })
        }
    }
    text.split("\n").forEach(l => lineToJSON(l.trim()))

    let findCost = function (node) {
        let edgesIn = edges.filter(e => (e.target == node.id))
        let costs = edgesIn.map(function (e) {
            let dependency = byName(e.source)
            return findCost(dependency) + e.minSpend
        })
        if (costs.length == 0) {
            return 0
        }
        return costs.reduce(function (a, b) { return Math.min(a, b) })
    }
    // Now work out the cost of reaching each node
    for (var j = 0; j < nodes.length; j++) {
        nodes = nodes.map(function (n) {
            let cost = n.cost
            if (cost == undefined) {
                cost = findCost(n)
            }
            return { id: n.id, cost: cost }
        })
    }

    console.log(nodes)

    showGraph({ links: edges, nodes: nodes })
}

let parseText = function () {
    textToGraph(document.getElementById("txtSkillDependency").value)
    redrawTextOnly()
}

let redrawTextOnly = function () {

    // Update the link
    document.getElementById("txtLink").value = (new URL(window.location.href).origin) + "?tree=" + encodeTree()

    // Actual redrawing
    let costLower = parseInt(document.getElementById("txtCostThresholdLower").value)
    let costUpper = parseInt(document.getElementById("txtCostThresholdUpper").value)
    let showCosts = $("input[name='showCostNumbers']:checked").val() == "true"
    let ringOpacity = ($("#ranRingOpacity").val() / 100)
    $(".rings").attr("stroke-opacity", ringOpacity)
    $(".textGroup").toArray().forEach(function (e) {
        let displayName = showCosts ? $(e).attr("name") + ` (${$(e).attr("cost")})` : $(e).attr("name")
        if ($(e).attr("cost") < costLower) {
            $("text", e).attr("fill", "#7A7")
            $("text", e).html(displayName)
        } else if ($(e).attr("cost") > costUpper) {
            $("text", e).attr("fill", "#77A")
            $("text", e).html(displayName)
        } else {
            $("text", e).attr("fill", "black")
            $("text", e).html(displayName)
        }
    })
}

color = "black"
let showCosts = true

var showGraph = function (data) {
    // Event handling
    const size = 500

    console.log(data)

    let maxCost = data.nodes.map(n => n.cost).reduce(function (a, b) { return Math.max(a, b) })
    idealSpacing = 100 // (2 * 0.9 * size) / maxCost

    var selected = null;

    drag = simulation => {

        function dragstarted(d) {
            if (!d3.event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
            if (selected != null) {
                $("#info-" + selected).toggle();
            }
            $("#info-" + d.id).toggle();
            selected = d.id;
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

        return d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }


    // Map drawing

    const links = data.links.map(d => Object.create(d));
    const nodes = data.nodes.map(d => Object.create(d));


    const constrain = function (x) {
        return Math.max(-size * 0.9, Math.min(x, size * 0.9))
    }


    const constrainForce = function (alpha) {
        for (var i = 0, n = nodes.length, node, k = alpha * 0.1; i < n; ++i) {
            node = nodes[i];
            node.x = constrain(node.x);
            node.y = constrain(node.y);
        }
    }

    const midForce = function (alpha) {
        nodes[0].x = 0
        nodes[0].y = 0
        nodes[0].vx = 0
        nodes[0].vy = 0
    }


    const costPush = function (alpha) {
        for (var i = 0, n = nodes.length, node, k = alpha * 0.1; i < n; ++i) {
            node = nodes[i];
            let r = Math.max(Math.pow((node.x * node.x + node.y * node.y), 0.5), 1)
            let ideal = idealSpacing * node.cost
            let speed = 0.1 * Math.abs(ideal - r) * (ideal - r) / r
            speed = speed / Math.max(Math.abs(speed), 20)
            node.vx = constrain(node.vx + speed * node.x)
            node.vy = constrain(node.vy + speed * node.y)
        }
    }


    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links)
            .id(d => d.id).
            strength(0.1))
        .force("charge", d3.forceManyBody().strength(-500))
        .force("mid", midForce)
        .force("costPush", costPush)
        .alpha(0.1)

    d3.selectAll("#map > *").remove();
    const svg = d3.select("#map").append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr('viewBox', `-${size} -${size} ${2 * size} ${2 * size}`)

    g = svg.append('g');

    svg.call(d3.zoom()
        .scaleExtent([1 / 2, 8])
        .on("zoom", zoomed));

    function zoomed() {
        g.attr("transform", d3.event.transform);
    }

    for (var j = maxCost + 1; j > 0; j--) {
        g.append("circle").attr("r", idealSpacing * (j - 0.5))
            .attr("stroke", "grey")
            .attr("stroke-opacity", 0.4)
            .attr("fill-opacity", 0)
            .attr("class", "rings")
    }

    const link = g.append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("color", "black");


    var node = g.append("g")
        .attr("class", "nodes")
        .selectAll("g")
        .data(nodes)
        .enter().append("g")
        .call(drag(simulation));





    function getTextBox(selection) {
        selection.each(function (d) {
            d.bbox = this.getBBox();
        })
    }


    var labels1 = node
        .append("text")
        .attr("text-anchor", "middle")
        .text(function (d) {
            return d.id;
        })
        .attr('fill', "black")
        .attr('x', 0)
        .attr('y', 3);

    node.call(getTextBox)
        .append("rect")
        .attr("x", function (d) {
            return d.bbox.x
        })
        .attr("y", function (d) {
            return d.bbox.y
        })
        .attr("width", function (d) {
            return d.bbox.width
        })
        .attr("height", function (d) {
            return d.bbox.height
        })
        .attr("fill", "white")
        .attr("opacity", "0.8")


    var circles = node
        .append("circle")
        .attr("r", "10px")
        .attr("fill", "white")

    var labels1 = node
        .attr("cost", function (d) { return d.cost })
        .attr("name", function (d) { return d.id })
        .classed("textGroup", true)
        .append("text")
        .attr("text-anchor", "middle")
        .text(function (d) {
            return d.id;
        })
        .attr('fill', "black")
        .attr('x', 0)
        .attr('y', 3);






    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("transform", d => `translate(${d.x},${d.y})`);
    });
}

let save = function () {
    document.cookie = encodeTree()
}

let load = function () {
    document.getElementById("txtSkillDependency").value = decodeTree(document.cookie)
}

let decodeTree = function(s){
    return s.replace("%20"," ").split("|||").join("\n")
}

let encodeTree = function () {
    let text = document.getElementById("txtSkillDependency").value
    return text.replace(/ /g,"%20").split("\n").join("|||")
}

// From GET

var loadedURL = new URL(window.location.href).search;
var search_params = new URLSearchParams(loadedURL);
var inputValue = search_params.get('tree');
$(document).ready(function () {
    if (inputValue) {
        let decoded = decodeTree(inputValue)
        document.getElementById("txtSkillDependency").value = decoded
        textToGraph(decoded)
    }
    redrawTextOnly()
}
)

let copyLink = function () {

    var textElement = document.getElementById("txtLink");

    /* Select the text field */
    textElement.select();
    textElement.setSelectionRange(0, 99999); /*For mobile devices*/
    document.execCommand("copy");

    /* Alert the copied text */
    alert("Copied the text: " + textElement.value);
}
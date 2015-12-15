function createTimeLine() {
    $( "#slider-range-min" ).slider({
        range: "min",
        value: 2015,
        min: 1996,
        max: 2015,
        slide: function( event, ui ) { //滾動時間時
            $( "#amount" ).val( ui.value );
            readDraft(ui.value);
        }
    });
    $( "#amount" ).val( $( "#slider-range-min" ).slider( "value" ) );
};

//Width and height for whole
var w = 1024;
var h = 768;

//image width and height
var image_w = 200;
var image_h = 200;

//For selected node
var active = d3.select(null);

//Define map projection
var projection = d3.geo.albersUsa()
    .translate([w/3, h/3.5])
    .scale([900]);

//Zoom behavior
var zoom = d3.behavior.zoom()
    .translate([0, 0])
    .scale(1)
    .scaleExtent([1, 8])
    .on("zoom", zoomed);

//Define path generator
var path = d3.geo.path()
    .projection(projection);

//Map the winrate to opacity[0.3, 0.9] 
var Opacity = d3.scale.linear()
    .range([0.2, 0.9]);

//Map the rank to radius[2, 20] 
var Scale = d3.scale.linear()
    .range([2, 20]);

//Create SVG element
var svg = d3.select("body")
    .append("svg")
    .attr("width", w)
    .attr("height", h)
    .on("click", stopped, true);

//Creater a group to store states
var g = svg.append("g")
    .attr("class","map");

//Enable to zoom
g.call(zoom.event);
//Allow free zooming
//g.call(zoom); 
    
//Load in state data, draw the map
d3.csv("data/US-states.csv", function(data) {
    createTimeLine();

    //Load in GeoJSON data
    d3.json("data/US-geo.json", function(json) {
        //Merge the EastorWest data and GeoJSON
        //Loop through once for each EastorWest data value
        for (var i = 0; i < data.length; i++) {
            var dataState = data[i].state;              //Grab state name
            var dataValue = parseFloat(data[i].value);  //Grab data value, and convert from string to float
            var dataEASTorWEST = data[i].EASTorWEST;
            //Find the corresponding state inside the GeoJSON
            for (var j = 0; j < json.features.length; j++) {
                var jsonState = json.features[j].properties.name;
                if (dataState == jsonState) {
                    //Copy the data value into the JSON
                    json.features[j].properties.EASTorWEST = dataEASTorWEST;
                    //Stop looking through the JSON
                    break;
                }
            }
        }

        //Bind data and create one path per GeoJSON feature
        g.selectAll("path")
            .data(json.features).enter()
            .append("path")
            .attr("stroke","white")
            .attr("stroke-width",2)
            .attr("d", path)
            .attr("class", function(d) {
                return d.properties.postal;})
            .style("fill", function(d) {
                //Get data value
                var EASTorWEST = d.properties.EASTorWEST;

                if (EASTorWEST) {
                    //If value exists…
                    if (EASTorWEST == "East") {
                        return "#C6E2FF";
                    } else {
                        return "#FFB6C1";
                    }
                } else {
                    //If value is undefined…
                    return "#CCCCCC";
                }
            })
            .on("click", stateClick);

        //顯示2015年的新秀資料    
        readDraft(2015);
    });
});


//Craete the radar chart
var radarChart = RadarChart.chart();
//default config
var defaultConfig = radarChart.config(); 
//defaultConfig.w and defaultConfig.h is 600
radarChart.config({w: 300, h: 300, levels: 4, maxValue: 100});
//TeamData for Rader chart
var teamRadarData = [];
//List of teams
var teamList = [];

//Return the map of a team
function teamDataset(teamRadarData) {
    return teamRadarData.map(function(d) {
        return {
            className: d.className,
            axes: d.axes.map(function(axis) {
                return { axis: axis.axis, value: axis.value };})
        };
    });
}

//Regularize the rank, rank 1 to 30 points
function regularizeRank(rank) {
    return ((31 - rank) / 30 * 100).toFixed(1);
}

//Judge if is in the array
function contains(array, obj) { 
    var i = array.length; 
    while (i--) { 
        if (array[i] === obj) { 
            return true; 
        } 
    } 
    return false; 
}

//Get the index of the element in an array
Array.prototype.indexOf = function(val) {
    for (var i = 0; i < this.length; i++) {  
        if (this[i] == val) return i;  
    }  
    return -1;  
};  

//Delete an element in an array
Array.prototype.remove = function(val) {
    var index = this.indexOf(val);  
    if (index > -1) {  
        this.splice(index, 1);  
    }
};  

//When click a Node
function teamClick(d) {
    selectedTeamName = d.teamname;
    if (contains(teamList, selectedTeamName)) { //Contains the node
        //Restore the node color
        d3.select(this)
            .style("fill", function(d){
            if (d.EASTorWEST == "East") {
                return "blue";
            } else {
                return "red";
            };
        });

        //Remove the selected team data
        for (var i = 0; i < teamRadarData.length; i++) {
            if (selectedTeamName == teamRadarData[i].className) {
                teamRadarData.remove(teamRadarData[i]);
                break;
            };
        }

        //Remove in the teamList;
        teamList.remove(selectedTeamName);

        //Existing node number after deleting
        if (teamList.length == 0) { //點掉node
            d3.selectAll(".pie-chart").remove();
        } 
    } else {    //Does not contain the node
        teamList.push(selectedTeamName);
        active = d3.select(this).style("fill", "orange");
        if (teamList.length == 1) {
            createPieChart(); // 產生旁邊的表格
            //Push the team data for radar chart, but not display
            //d3.csv("data/teamstats.csv", function(teamData) {
                //Loop through once for each team data value
            //    pushTeamRadarData(teamData);
            //});

        }
        
    }

    //這裡用不到
    //Push team data for radar chart
    function pushTeamRadarData(teamData){
        for (var i = 0; i < teamData.length; i++) { 
            if (teamData[i].team == selectedTeamName) { //Grab the team
                var teamAxes = [];
                teamAxes.push({axis: "Points", value: regularizeRank(teamData[i].rPTS)});
                teamAxes.push({axis: "Turnovers", value: regularizeRank(teamData[i].rTOV)});
                teamAxes.push({axis: "Steals", value: regularizeRank(teamData[i].rSTL)});
                teamAxes.push({axis: "Blocks", value: regularizeRank(teamData[i].rBLK)});
                teamAxes.push({axis: "Rebounds", value: regularizeRank(teamData[i].rREB)});
                teamAxes.push({axis: "Assists", value: regularizeRank(teamData[i].rAST)});

                teamRadarData.push({className: teamData[i].team, axes: teamAxes});
            }
        }
    }

    //Create PieChart for players
    function createPieChart() {
        d3.selectAll(".pie-chart").remove();

        var width = 150;
        var height = 500;
        var radius = Math.min(width, height) / 2;
        var innerRadius = 0.3 * radius;

        //Players' data in a team
        teamPlayer = [];
        //teamPlayerName for returning a color;
        teamPlayerName = [];

        //Load each players' data
        d3.csv("data/players.csv", function(error, playerData) {
            playerData.forEach(function(d) {
                //change into number
                d.PTS = +d.PTS
                d.AST = +d.AST
                d.REB = +d.REB
                d.BLK = +d.BLK
                d.STL = +d.STL
                d.TOV = +d.TOV

                //Save the selected team data
                if (d.team == teamList[teamList.length - 1]) {
                    teamPlayer.push({
                        player: d.player, 
                        team: d.team,
                        PTS: d.PTS, 
                        PIE: d.PIE, 
                        REB: d.REB, 
                        AST: d.AST, 
                        STL: d.STL, 
                        BLK: d.BLK, 
                        TOV: d.TOV
                    });
                    teamPlayerName.push(d.player);
                }
            });

            //For full percentage of the pie chart
            var maxPlayerPTS = d3.max(playerData, function(d) { return d.PTS; }); 
            var maxPlayerAST = d3.max(playerData, function(d) { return d.AST; });   
            var maxPlayerREB = d3.max(playerData, function(d) { return d.REB; });
            var maxPlayerBLK = d3.max(playerData, function(d) { return d.BLK; });
            var maxPlayerSTL = d3.max(playerData, function(d) { return d.STL; });
            var maxPlayerTOV = d3.max(playerData, function(d) { return d.TOV; });

            var tip = d3.tip()
                .attr("class", "d3-tip pie-chart-tip")
                .offset([0, -128])
                .html(function(d) { return "<span>" + d.data.player + "</span>"; });;

            var outlineArc = d3.svg.arc()
                .innerRadius(innerRadius)
                .outerRadius(radius);

            //Six pie charts
            for (var i = 0 ; i < 6; i++) {
                var pie = d3.layout.pie().sort(null);
                var arc = d3.svg.arc().innerRadius(innerRadius);
                //In the center
                var shortAttrName = ["PTS", "AST", "REB", "BLK", "STL", "TOV"];
                //For the title when hover
                var fullAttrName = ["Points", "Assists", "Rebounds", "Blokcks", "Steals", "Turnovers"];

                var pieChart = svg.append("g")
                    .attr("class", "pie-chart")
                    .attr("width", width)
                    .attr("height", height)

                    .append("g");

                //position of the pie charts
                pieChart.attr("class", "single-pie-chart").attr("transform", function() { 
                    if (i <= 2){
                        return "translate(" + 770 + "," + (110 + i * 160) +")" ;
                    } else {
                        return "translate(" + 930 + "," + (110 + (i - 3) * 160) +")" ;
                    }
                });

                //words in the center
                pieChart.append("g:text")
                    .attr("class", "aster-score")
                    .attr("dy", ".35em")
                    .attr("text-anchor", "middle") // text-align: right
                    .text(function() { return shortAttrName[i]; })
                    .append("title")
                    .text(function() { return fullAttrName[i] })
                    .call(tip); 

                if (i == 0) { 
                    pie.value(function(d) { return d.PTS; });
                    arc.outerRadius(function (d) { return (radius - innerRadius) * d.data.PTS / maxPlayerPTS + innerRadius; });
                }
                if (i == 1) { 
                    pie.value(function(d) { return d.AST; });
                    arc.outerRadius(function (d) { return (radius - innerRadius) * d.data.AST / maxPlayerAST + innerRadius; });
                }
                if (i == 2) { 
                    pie.value(function(d) { return d.REB; }); 
                    arc.outerRadius(function (d) { return (radius - innerRadius) * d.data.REB / maxPlayerREB + innerRadius; });
                }
                if (i == 3) { 
                    pie.value(function(d) { return d.BLK; }); 
                    arc.outerRadius(function (d) { return (radius - innerRadius) * d.data.BLK / maxPlayerBLK + innerRadius; })
                }
                if (i == 4) {
                    pie.value(function(d) { return d.STL; }); 
                    arc.outerRadius(function (d) { return (radius - innerRadius) * d.data.STL / maxPlayerSTL + innerRadius; })
                }
                if (i == 5) { 
                    pie.value(function(d) { return d.TOV; });
                    arc.outerRadius(function (d) { return (radius - innerRadius) * d.data.TOV / maxPlayerTOV + innerRadius; });
                }

                var pieColor = d3.scale.linear()
                    .domain([0, 15])
                    .range(["yellow", "green"])
                    .interpolate(d3.interpolateLab);

                var path = pieChart.selectAll(".solidArc")
                    .data(pie(playerDataset(teamPlayer)))
                    .enter().append("path")
                    .attr("fill", function(d) { return pieColor(teamPlayerName.indexOf(d.data.player)); })
                    .attr("class", "solidArc")
                    .attr("stroke", "gray")
                    .attr("d", arc)
                    .on('mouseover', tip.show)
                    .on('mouseout', tip.hide)
                    .append("title")
                    .text(function(d){ return "Team: " + d.data.team; });

                var outerPath = pieChart.selectAll(".outlineArc")
                    .data(pie(playerDataset(teamPlayer)))
                    .enter().append("path")
                    .attr("fill", "none")
                    .attr("stroke", "gray")
                    .attr("class", "outlineArc")
                    .attr("d", outlineArc);  
            }
        });
        
        //Return the map of Players' data
        function playerDataset(teamPlayer) {
            return teamPlayer.map(function(d) {
                return {
                    player: d.player,
                    team: d.team,
                    PTS: d.PTS,
                    PIE: d.PIE,
                    REB: d.REB,
                    AST: d.AST, 
                    STL: d.STL, 
                    BLK: d.BLK, 
                    TOV: d.TOV
                };
            });
        }
    }
}



//Click the state to zoom
function stateClick(d) {
    //Inverse when have selected
    if (active.node() == this) {
        active.style("fill", function(d) {
            //Get data value
            var EASTorWEST = d.properties.EASTorWEST;
            if (EASTorWEST) {
                //If value exists…
                if (EASTorWEST == "East") {
                    return "#C6E2FF";
                } else {
                    return "#FFB6C1";
                }
            } else {
                //If value is undefined…
                return "#ccc";
            }
        });
        //Delete the state name
        stateAbb = d3.select(this).attr("class");
        svg.selectAll(".text-" + stateAbb).remove();

        return stateReset();
    }

    active = d3.select(this).style("fill", "orange");

    //Hide the radar chart, stack bar chart, pie chart
    d3.selectAll(".bar-form")
        .style("display", "none");  
    svg.selectAll(".teamRadar")
        .style("display", "none");
    svg.selectAll(".stack-bar")
        .style("display", "none");
    svg.selectAll(".pie-chart")
        .style("display", "none");

    //Modify the size 
    var bounds = path.bounds(d),
        dx = bounds[1][0] - bounds[0][0],
        dy = bounds[1][1] - bounds[0][1],
        x = (bounds[0][0] + bounds[1][0]) / 2,
        y = (bounds[0][1] + bounds[1][1]) / 2,
        scale = 0.7 / Math.max(dx / w, dy / h),
        translate = [w / 2 - scale * x, h / 2 - scale * y];

    svg.transition()
        .duration(600)
        .call(zoom.translate(translate).scale(scale).event);

    g.append("text")
        .attr("class", "text-" + d.properties.postal)
        .attr("x", x - 20)
        .attr("y", y)
        //.attr("x", projection([d.properties.longitude, d.properties.latitude])[0])
        //.attr("y", projection([d.properties.longitude, d.properties.latitude])[1])
        .attr("font-size", "10px")
        //.style("fill", "#888888")
        .style("cursor", "default")
        .text(d.properties.name);
}

//Get back to the normal map
function stateReset() {
    active = d3.select(null);

    svg.transition()
      .duration(600)
      .call(zoom.translate([0, 0]).scale(1).event);

    d3.selectAll(".bar-form")
        .style("display", "inline");
    svg.selectAll(".teamRadar")
        .style("display", "inline");
    svg.selectAll(".stack-bar")
        .style("display", "inline");
    svg.selectAll(".pie-chart")
        .style("display", "inline");
}

function zoomed() {
  g.style("stroke-width", 1.5 / d3.event.scale + "px");
  g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
}

// If the drag behavior prevents the default click,
// also stop propagation so we don’t click-to-zoom.
function stopped() {
    if (d3.event.defaultPrevented) {
        d3.event.stopPropagation();
    }
}

//滑鼠滑過點的時候顯示圈圈
//Emphasize
function nodeMouseover(d){
    d3.select(this).select("circle")
        .transition()
        .duration(200)
        .attr("r", function(d){ 
            return 1.5 * Scale(d.winrate); })
        .style("opacity", 1)
        .style("stroke-width", "2px");

    d3.select(this).select("text")
        .transition()
        .duration(200)
        .attr("dx", function(d){
            return 1.5 * Scale(d.winrate);})
        .style("fill", "#000000")
        .text(function(d) {
            return d.abb + " (" + d.winrate + "%)";});

    //Append the logo of the team
    g.append("image")
        .attr("class", d.abb)
        .attr("xlink:href", "logo/" + d.abb + "_logo.svg")
        .attr("width", image_w + "px")
        .attr("height", image_h + "px")
        //remove the blink effect
        .attr("x", projection([d.lon, d.lat])[0] + 5)
        .attr("y", projection([d.lon, d.lat])[1] + 5);
}

//Get back to original status
function nodeMouseout(d){
    d3.select(this).select("circle")
        .transition()
        .duration(200)
        .attr("r", function(d) { 
            return Scale(d.winrate); })
        .style("opacity", function(d){
            return Opacity(d.winrate);})
        .style("stroke-width", "1px");

    d3.select(this).select("text")
        .transition()
        .duration(200)
        .attr("dx", function(d){
            return Scale(d.winrate);})
        .style("fill", "#888888")
        .text(function(d) {
            return d.abb});

    g.select("image")
        .remove();
}

//讀取當年度新秀資料
function readDraft(year) {
    //Load in NBA teams data
        d3.csv("data/NBA-teams.csv", function(data) {
            //Map the rank to radius[2, 20] 
            Scale.domain([0, d3.max(data, function(d) { return d.winrate; })]);


            //Map the winrate to fontsize[10, 20] 
            var FontSize = d3.scale.linear()
                .domain([15, 1])
                .range([10, 20]);

            //Create nodes group
            var nodes = g.selectAll("nodes")
                .data(data)
                .enter()
                .append("g")
                .attr("class", "team")
                .attr("transform", function(d) {
                    return "translate(" + projection([d.lon, d.lat])[0] + "," + projection([d.lon, d.lat])[1] + ")";})
                .on("mouseover", nodeMouseover)
                .on("mouseout", nodeMouseout);

            
            //Circles for teams
            nodes.append("circle")
                .attr("class", function(d) { return d.abb })
                .attr("r", function(d){
                    return Scale(d.winrate);})
                .style("fill", function(d){
                    if (d.EASTorWEST == "East") {
                        return "blue";
                    } else {
                        return "red";
                    };
                })
                .style("opacity", function(d){
                    return Opacity(d.winrate);})
                .style("cursor", "pointer")
                .on("click", teamClick); //點node 呼叫teamclick
            
            //Text for temm abbreviation
            nodes.append("text")
                .attr("class", function(d) {
                    return "text " + d.abb;})
                .attr("dx", function(d){
                    return Scale(d.winrate);})
                .attr("dy", ".3em")
                .attr("font-size", function(d) {
                    return FontSize(d.rank) + "px";})
                .style("fill", "#888888")
                .style("font-weight", "bold")
                .style("cursor", "default")
                .text(function(d) {
                    return d.abb;});
        });

}
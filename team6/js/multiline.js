function drawMultilineChart(domobj, domobjsel, _width){

    var dateParse = d3.time.format("%Y-%m-%d").parse;

    var margin = {top: 20, right: 20, bottom: 30, left: 50},
        width = _width - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    // reserve for expressing
    //     label of each line

    var x = d3.time.scale()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    var color = d3.scale.category20();

    var mycolor = ["#FFFF00", "#FF8250","#FF0000"];

    var rankScale = d3.scale.linear()
                        .range(mycolor)
                        .domain([0,10,20]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .tickSize(-height,0);

    var yAxis = d3.svg.axis()
        .scale(y)
        .ticks(5,"$")
        .orient("left")
        .tickSize(-width,0);

    var line = d3.svg.line()
        //.interpolate("cardinal")
        .x(function(d) { return x(d.Date); })
        .y(function(d) { return y(d.price); });

    // basic form
    var svg = domobj
        .append("svg")
            .attr("width", width + margin.left + margin.right + 90)
            //.attr("height", height + margin.top + margin.bottom)
            .attr("height", 550 + margin.top + margin.bottom)
        .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var bg = svg.append("g")
            .append("rect")
            .attr("class","main_rect")
            .attr("width", width)
            .attr("height", height);

    var focus = svg.append("g")
            .style("display", "none");

    //end--line chart feature setting


    // connect to firebase db
    var firebaseRef = new Firebase("https://ikdde-team6.firebaseio.com/all_data/");

    // store data from firebase and drawing charts
    firebaseRef.on("value", function(snapshot) {

        var vgsnap = snapshot.child("vegetable_data");

        var tysnap = snapshot.child("typhoon_data");

        var data = [];

        var tydata = [];

        // get all vegetable name
        var name = d3.keys(vgsnap.val()).filter(function(name) { return name != 'default'});

        //console.log(name);

        vgsnap.forEach( function(child) {
            child.forEach( function(grandChild) {
                data.push( {
                    cate: child.key(),
                    name: grandChild.key(),
                    value: grandChild.val(),
                    opacity: +0
                });
            });
        });

        tysnap.forEach( function(child) {
            var ty = child.val();
            tydata.push( {
                name: ty.typhoon_name,
                rank: +ty.rank,
                start_date: new Date(+ty.start_year, +ty.start_month-1, +ty.start_day),
                end_date: new Date(+ty.end_year, +ty.end_month-1, +ty.end_day)
            });
        });

        // reconstruct(rebuild) date
        data.forEach( function(v) {
            v.value = d3.values(v.value);
            v.value.forEach( function(e) {
                e.Date = new Date(e.date.year,e.date.month-1,e.date.day);
            });
            v.value = v.value.filter( function(e) { return e.Date > new Date(2015,0,0); });
        });

        tydata = tydata.filter(function(ty) { return ty.start_date > new Date(2015,0,0); });

        console.log(d3.extent(tydata, function(ty) {return ty.rank; }));

        // set color domain by vegetable name
        //     vegetable name --mapping--> specific color
        color.domain(data.map(function(v) { return v.name}));


        // set x domain by range from min of date to max of date
        //     x invoked in xAxis
        x.domain([
            d3.min(data, function(v) { return d3.min(v.value, function(d) { return d.Date});}),
            d3.max(data, function(v) { return d3.max(v.value, function(d) { return d.Date});})
        ]);


        // find max y, if y_max is NaN(no line display), set as default 50
        var y_max = d3.max(
                data.filter( function(v) { return v.opacity===1;}),
                function(v) { return d3.max(v.value, function(d) { return d.price; }); }
        );

        y_max = isNaN(y_max)? +50: y_max+20;

        // set y domain by range from min of date to max of date
        //     y invoked in yAxis
        y.domain([0,y_max]);

        // append x axis by feature xAxis
        var gxAxis = svg.append("g")
                .attr("class","x axis")
                .attr("transform","translate(0," + height + ")")
                .call(xAxis);
        
        // append y axis by feature yAxis
        var gyAxis = svg.append("g")
                .attr("class","y axis")
                .call(yAxis)
            .append("text")
                .attr("transform","rotate(-90)")
                .attr("y",6)
                .attr("dy", ".71em")
                .style("text-anchor", "end")
                .text("Price/Weight ($/kg)");

        svg.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", width)
            .attr("height", height);

        // add all g
        var vg = svg.selectAll(".city")
                    .data(data)
                    .enter()
                .append("g")
                    .attr("class","city")
                    .attr("id", function(v) { return 'tag_'+v.name; })
                    .attr("clip-path", "url(#clip)")
                    .style("opacity", function(v) { return v.opacity; });

        // add path by feature "line" under each ".city"
        var graph = vg.append("path")
            .attr("class","line")
            .attr("id", function(v) { return "tag_"+v.name; })
            .attr("d", function(v) { return line(v.value); })
            .style("stroke", function(v) { return color(v.name); });

        // append label for each line
        vg.append("text")
            .datum(function(d) { return {name: d.name, value: d.value[d.value.length - 1]}; })
            .attr("class","vglabel")
            .attr("id", function(v) { return "tag_"+v.name; })
            .attr("transform", function(d) { return "translate(" + x(d.value.Date) + "," + y(d.value.price) + ")"; })
            .attr("x", 3)
            .attr("dy", ".35em")
            .text(function(d) { return d.name; })

            // can be modiy by css
            .style("font-size","20px")
            .style("font-weight","bold")
            .style("stroke", "#000")
            .style("fill", function(v) { return color(v.name); });

        // typhoon
        var tybar = svg.selectAll("bar")
                .data(tydata)
                .enter()
            .append("rect")
                .attr("clip-path", "url(#clip)")
                .attr("class","bar")
                .attr("x", function(ty) { return (x(ty.end_date)+x(ty.start_date))/2; })
                .attr("width", function(ty) { return x(ty.end_date) - x(ty.start_date); })
                .attr("y", 0)
                .attr("height", height)
                .style("fill", function(ty) {
                        var _rank = ty.rank <= 15 ? 0  :
                                    ty.rank <= 25 ? 10 :
                                    20;
                        return rankScale( _rank); })
                .style("opacity", 0.5);

        focus.selectAll("x")
                .data(data)
                .enter()
            .append("line")
                .attr("class","x")
                .attr("id", function(v) { return "tag_" + v.name; })
                .style("display","none")
                .style("stroke", "blue")
                .style("stroke-dasharray", "3.3")
                .style("opacity", 0.5)
                .attr("y1", -height)
                .attr("y2", 0);

        focus.selectAll("y")
                .data(data)
                .enter()
            .append("line")
                .attr("class","y")
                .attr("id", function(v) { return "tag_"+v.name; })
                .style("display","none")
                .style("stroke", function(v) { return color(v.name); })
                //.style("stroke-dasharray", "3.3")
                .style("opacity", 0.5)
                .attr("x1", 0)
                .attr("x2", width);

        focus.selectAll("dot")
                .data(data)
                .enter()
            .append("circle")
                .attr("class", "dot")
                .attr("id", function(v) { return "tag_"+v.name; })
                .style("display","none")
                .style("opacity", 1)
                .style("fill", "none")
                .style("stroke", function(v) { return color(v.name); })
                .attr("r", 4);


        var tooltip = domobj
            .append("div")
                .attr("class","tooltip")
                .style("opacity",1)
                .style("display","none");


        svg.append("rect")
            .attr("width", width)
            .attr("height", height)
            .style("fill", "none")
            .style("pointer-events", "all")
            .on("mouseover", function() {
                focus.style("display", null);
                tooltip.style("display",null);
            })
            .on("mouseout", function() { 
                focus.style("display", "none");
                tooltip.style("display","none");
            })
            .on("mousemove", mousemove);

        var bisectDate = d3.bisector(function(v) { return v.Date; }).left;

        // check box
        var eachInputDiv = domobjsel
            .append("div")
            .selectAll(".vginput")
            .data(data)
            .enter()
                .append("div")
                .style("display", "inline-block")
                .style("margin", 3);
        
        
        eachInputDiv
            .append("div")
            .style("background-color", function(v) { return color(v.name); })
            .text(function(v) { return "" + v.name; })
                .append("input")
                .attr("type","checkbox")
                .property("position", "absolute")
                .property("left", function(v) { return v.id*10+"px"; })
                .on("change", function(v) {
                    this.checked ^ true;
                    click(v);
                });

        /*eachInputDiv
            .append("label")
            .text(function(v) { return "" + v.name; });*/

        function mousemove () {

            var max = [];
            var x0 = x.invert(d3.mouse(this)[0]);

            data.forEach( function(v) {
                if (v.opacity===1) {
                    var i = bisectDate(v.value, x0, 1);
                    var d0 = v.value[i - 1];
                    var d1 = v.value[i];
                    var d = x0 - d0.Date > d1.Date - x0 ? d1 : d0;

                    max.push({
                        name: v.name,
                        price: d.price,
                        Date: d.Date
                    });

                    focus.select("#tag_" + v.name + ".x")
                        .attr("transform", "translate(" + x(d.Date) + ","
                                                        + y(0) + ")");
                    focus.select("#tag_" + v.name + ".y")
                        .attr("transform", "translate(" + 0 + ","
                                                        + y(d.price) + ")");
                    focus.select("#tag_" + v.name + ".dot")
                        .attr("transform", "translate(" + x(d.Date) + ","
                                                        + y(d.price) + ")");
                }
            });
        
            var _max = max.length!==0?d3.max(max, function(v) { return v.price; }):0;

            tooltip
                .style("left",d3.event.pageX+"px")
                .style("top",y(_max)+"px");
        }


        // for toggle event
        function click(v) {
            var duration_time = 800;
            v.opacity ^= 1;

            var y_max = d3.max(
                data.filter( function(v) { return v.opacity===1; }),
                function(v) {return d3.max(v.value, function(d) { return d.price; }); }
            );

            y_max = isNaN(y_max)?+50:y_max+20;
            y.domain([0,y_max]);

            d3.select(".y.axis")
                .transition()
                .duration(duration_time)
                .call(yAxis);

            data.forEach( function(v) {
                d3.select(".line#tag_"+v.name)
                    .transition()
                    .duration(duration_time)
                    .attr("d", function(v) { return line(v.value); });

                d3.select(".city#tag_"+v.name)
                    .transition()
                    .duration(duration_time)
                    .style("opacity", function(v) { return v.opacity; });

                /* wrong
                d3.select(".vglabel#tag_"+v.name)
                    .transition()
                    .duration(duration_time)
                    .attr("transform", function(v) { return "translate(" + x(v.value.Date) + "," + y(v.value.price) + ")"; });
                */

                d3.select(".x#tag_"+v.name)
                    .style("display", function(v) { return v.opacity===1 ?null:"none";});

                d3.select(".y#tag_"+v.name)
                    .style("display", function(v) { return v.opacity===1 ?null:"none" ;});

                d3.select(".dot#tag_"+v.name)
                    .style("display", function(v) { return v.opacity===1 ?null:"none"; });
            });
        }

    ///// brush

    var height2 = 50;

    var x2 = d3.time.scale()
        .range([0, width]);

    x2.domain([
        d3.min(data, function(v) { return d3.min(v.value, function(d) { return d.Date});}),
        d3.max(data, function(v) { return d3.max(v.value, function(d) { return d.Date});})
    ]);

    var y2 = d3.scale.linear().range([height2, 0]);

    var xAxis2 = d3.svg.axis().scale(x2).orient("bottom");

    var brush = d3.svg.brush()
        .x(x2)
        .on("brush", brushed);

    var area2 = d3.svg.area()
        .interpolate("monotone")
        .x(function(d) { return x2(d.Date); })
        .y0(height2)
        .y1(function(d) { return y2(d.price); });

    var context = svg.append("g")
        .attr("class", "context")
        .attr("transform", "translate(" + 0 + "," + 500 + ")");

    context.append("path")
        .data(data)
        .attr("class", "area")
        .attr("d", area2);

    context.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height2 + ")")
        .call(xAxis2);

    context.append("g")
        .attr("class", "x brush")
        .call(brush)
    .selectAll("rect")
        .attr("y", -6)
        .attr("height", height2 + 7);

    ////////////////

        function brushed() {
            x.domain(brush.empty() ? x2.domain() : brush.extent());
            graph
                .attr("d", function(v) { return line(v.value); });

            tybar
                .attr("x", function(ty) { return (x(ty.end_date)+x(ty.start_date))/2; })
                .attr("width", function(ty) { return x(ty.end_date) - x(ty.start_date); })
                .attr("y", 0)
                .attr("height", height);

            vg.select(".x.axis").call(xAxis);
            d3.select(".x.axis").call(xAxis);
        }

    });

}
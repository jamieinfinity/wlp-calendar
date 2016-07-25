(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3'), require('d3-tip'), require('d3-grid')) :
    typeof define === 'function' && define.amd ? define(['exports', 'd3', 'd3-tip', 'd3-grid'], factory) :
    (factory((global.wlp_calendar = {}),global.d3,global.d3.tip,global.d3.layout.grid));
}(this, function (exports,d3,d3Tip,d3Grid) { 'use strict';

    d3 = 'default' in d3 ? d3['default'] : d3;

    function viewModel() {
        return {}
    }

    const model = viewModel();

    const calendarMargin = {top: 20, right: 20, bottom: 30, left: 20};
    const calendarSize = {
        height: 400 - calendarMargin.top - calendarMargin.bottom,
        width: 800 - calendarMargin.left - calendarMargin.right
    };
    const calendarTabSize = {
        height: 20,
        width: calendarSize.width
    };
    const calendarTabPadding = (10.0 / calendarSize.width);


    let calendarYears = [
    ];

    let rectGrid;

    // let prettyDateFormat = d3.time.format("%a %b %e, %Y at %_I:%M %p");

    // function calendarExtentDates() {
    //     let minDate = sharedTimeScale.invert(0);
    //     let maxDate = sharedTimeScale.invert(calendarSize.width);
    //     return [minDate, maxDate];
    // }

    function drawCalendar(domElementID) {
        rectGrid = d3.layout.grid()
            .bands()
            .rows([1])
            .size([calendarTabSize.width, calendarTabSize.height])
            .padding([calendarTabPadding, calendarTabPadding]);

        let rootSVG = d3.select(domElementID).append("svg")
            .attr("id", "calendarRootSVG")
            .attr("width", calendarSize.width + calendarMargin.left + calendarMargin.right)
            .attr("height", calendarSize.height + calendarMargin.top + calendarMargin.bottom);

        rootSVG.append("g")
            .attr("id", "timelineRects")
            .attr("transform", "translate(" + calendarMargin.left + "," + calendarMargin.top + ")");

        updateYears(calendarYears);
    }

    function initYearsAttributes(selection) {
        selection.append('rect')
            .attr("fill", "#eee");

        selection.append("text")
            .attr("font-family", "Avenir")
            .attr("font-size", "14px")
            .attr("fill", "#999");
    }

    function updateYearsAttributes(selection) {
        selection.attr("transform", function (d) {
                return "translate(" + d.x + "," + d.y + ")";
            });
        let rects = selection.selectAll('rect');
        rects
            .attr("width", rectGrid.nodeSize()[0])
            .attr("height", rectGrid.nodeSize()[1]);

        let texts = selection.selectAll("text");
        texts
            .text(function (d) {
                return d.year;
            })
            .style("text-anchor", "middle")
            .style("alignment-baseline", "central")
            .attr("x", rectGrid.nodeSize()[0]/2)
            .attr("y", rectGrid.nodeSize()[1]/2);
    }

    function updateYears(data) {
        let rectData = rectGrid(data);

        let yearsDOMData = d3.select("#timelineRects")
            .selectAll(".yearGroup")
            .data(rectData, function(d) {
                return d.year;
            });
        yearsDOMData.exit().remove();
        initYearsAttributes(yearsDOMData.enter().append('g').attr("class", "yearGroup"));
        updateYearsAttributes(yearsDOMData);
    }

    function extractYears(data) {
        let years = d3.nest()
            .key(function (d) {
                return d.getFullYear();
            })
            .entries(data);
        return Object.keys(years).map(function (key) {
            return {"year": parseInt(years[key].key)}
        });
    }

    function addData(data) {
        calendarYears = extractYears(data);
        updateYears(calendarYears);
    }

    function resizeCalendar(width) {

    }

    var version = "0.0.24";

    exports.version = version;
    exports.drawCalendar = drawCalendar;
    exports.addData = addData;
    exports.resizeCalendar = resizeCalendar;
    exports.viewModel = viewModel;

}));
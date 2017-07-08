import {select} from "d3-selection";
import {timeFormat} from "d3-time-format";
import {scaleLinear} from "d3-scale";
import {timeDay} from "d3-time";
import {line, curveLinear} from "d3-shape";

const prettyDateFormat = timeFormat("%B %e, %Y"),
    // dateFormat = timeFormat("%Y-%m-%d"),
    // monthDateFormat = timeFormat("%b"),
    yearFormat = timeFormat("%Y"),
    weekdayFormat = timeFormat("%w"), // Sunday = 0
    weekNumForDate = timeFormat("%W"),
    numWeeksMax = 53,
    numWeekdaysMax = 6,
    calendarMargin = {top: 10, right: 10, bottom: 10, left: 50},
    calendarSize = {height: 0, width: 0};

let daySquareSize,
    xScale,
    yScale;


function weekdayNumForDate(date) {
    let weekday = Number(weekdayFormat(date)) - 1;
    if (weekday === -1) {
        weekday = numWeekdaysMax;
    }
    return 6 - weekday;
}

function calendarCoodinateForDate(date) {
    return {"week": parseInt(weekNumForDate(date)), "weekday": weekdayNumForDate(date)};
}

function addDayEntryToDatasetForDate(dataset, date, steps) {
    const keyYear = yearFormat(date),
        entry = calendarCoodinateForDate(date),
        key = keyYear + ":" + entry.week + ":" + entry.weekday;
    entry["steps"] = steps;
    entry["date"] = prettyDateFormat(date);
    dataset[key] = entry;
}


function makeCalendar(domElementID, width, year) {

    calendarSize.width = width - calendarMargin.left - calendarMargin.right;
    daySquareSize = calendarSize.width / numWeeksMax;
    calendarSize.height = daySquareSize * (numWeekdaysMax + 1);
    xScale = scaleLinear().domain([0, numWeeksMax]).range([0, numWeeksMax * daySquareSize]);
    yScale = scaleLinear()
        .domain([0, numWeekdaysMax])
        .range([numWeekdaysMax * daySquareSize, 0]);


    const dataset = {},
        endDay = new Date("12/31/" + year);
    let dateIter = new Date("1/1/" + year),
        maxDays = timeDay.count(dateIter, endDay) + 1;

    for (let i = 0; i < maxDays; i++) {
        addDayEntryToDatasetForDate(dataset, dateIter, -1);
        dateIter.setDate(dateIter.getDate() + 1);
    }

    const monthPathPoints = [];

    for (let m = 0; m < 12; m++) {
        const pathpoints = [],
            ymin = -1,
            ymax = 6,
            startday = new Date(year, m, 1),
            startcoord = calendarCoodinateForDate(startday),
            endday = new Date(year, m + 1, 0),
            endcoord = calendarCoodinateForDate(endday);

        pathpoints[0] = [startcoord.week, startcoord.weekday];
        pathpoints[1] = [startcoord.week + 1, startcoord.weekday];
        pathpoints[2] = [startcoord.week + 1, ymax];
        pathpoints[3] = [endcoord.week, ymax];
        pathpoints[4] = [endcoord.week + 1, ymax];
        pathpoints[5] = [endcoord.week + 1, endcoord.weekday - 1];
        pathpoints[6] = [endcoord.week, endcoord.weekday - 1];
        pathpoints[7] = [endcoord.week, ymin];
        pathpoints[8] = [startcoord.week, ymin];

        monthPathPoints.push(pathpoints);
    }

    let monthLine = line()
        .x(function (d) {
            return xScale(d[0]);
        })
        .y(function (d) {
            return yScale(d[1]);
        })
        .curve(curveLinear);


    const data = Object.keys(dataset).map(function (key) {
        return dataset[key];
    });

    const container = select(domElementID).append("div")
            .attr("id", "calendarContainer"),
        root = container.append("div")
            .attr("id", "calendarRootDiv"),
        svgRootCalendar = root.append("svg")
            .attr("id", "calendarRootSVG")
            .attr("width", calendarSize.width + calendarMargin.left + calendarMargin.right)
            .attr("height", calendarSize.height + calendarMargin.top + calendarMargin.bottom),
        svgInnerCalendar = svgRootCalendar.append("svg")
            .attr("id", "calendarInnerSVG")
            .attr("vector-effect", "non-scaling-stroke")
            .attr("width", calendarSize.width)
            .attr("height", calendarSize.height)
            .attr("x", calendarMargin.left)
            .attr("y", calendarMargin.top)
            .attr("viewBox", "0 0 " + calendarSize.width + " " + calendarSize.height);

    svgInnerCalendar.append("rect")
        .attr("id", "innerCalendarBackground")
        .attr("width", calendarSize.width)
        .attr("height", calendarSize.height);


    const calendarDays = svgInnerCalendar.append('g').attr('id', 'calendarDays'),
        rect = calendarDays.selectAll("rect").data(data),
        path = calendarDays.selectAll("path").data(monthPathPoints);

    rect.enter().append("rect")
        .attr("class", "day")
        .attr("y", function (d) {
            return yScale(d.weekday);
        })
        .attr("x", function (d) {
            return xScale(d.week);
        })
        .attr("height", daySquareSize)
        .attr("width", daySquareSize)
        .attr("fill", "#ccc");

    path.enter().append("path")
        .attr("d", monthLine)
        .attr("fill", "none");


    let weekLabelForWeekDay = {0: "M", 1: "Tu", 2: "W", 3: "Th", 4: "F", 5: "Sa", 6: "Su"};
    let weekLabelInfo = [];
    for (let j = 0; j < 7; j++) {
        let weekday = 6 - j - 0.7;
        let week = -1.4;
        weekLabelInfo.push({"week": week, "weekday": weekday, "label": weekLabelForWeekDay[j]});
    }

    let weekText = svgInnerCalendar.selectAll("text.weekLabel").data(weekLabelInfo);

    weekText.enter().append("text")
        .attr("class", "weekLabel")
        .attr("x", function (d) {
            return xScale(d.week);
        })
        .attr("y", function (d) {
            return yScale(d.weekday);
        })
        .text(function (d) {
            return d.label;
        });

}


// function makeCalendar(domElementID) {
//     select(domElementID).append("div")
//         .attr("id", "calendarContainer");
//     select("#calendarContainer").append("div")
//         .attr("id", "yearContainer");
//
//     let years = [2015, 2016, 2017];
//
//     select("#yearContainer").selectAll('div').data(years).enter().append('div')
//         .attr('class', 'yearDiv')
//         .text(function(d) {
//             return d;
//         })
//         .on('click', () => {});
//
// }


export {makeCalendar};


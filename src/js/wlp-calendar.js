import {select} from "d3-selection";
import {timeFormat} from "d3-time-format";
import {scaleLinear} from "d3-scale";
import {timeDay, timeMonths} from "d3-time";
import {line, curveLinear} from "d3-shape";
import {range, max, min} from "d3-array";

const prettyDateFormat = timeFormat("%B %e, %Y"),
    // dateFormat = timeFormat("%Y-%m-%d"),
    monthDateFormat = timeFormat("%b"),
    yearFormat = timeFormat("%Y"),
    weekdayFormat = timeFormat("%w"), // Sunday = 0
    weekNumForDate = timeFormat("%W"),
    numWeeksMax = 53,
    numWeekdaysMax = 6,
    calendarGroupSpacing = 5,
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


function makeCalendar(domElementID, width, years0) {

    calendarSize.width = width - calendarMargin.left - calendarMargin.right;
    daySquareSize = calendarSize.width / numWeeksMax;
    calendarSize.height = daySquareSize * (numWeekdaysMax + 1) + 3 * (daySquareSize + calendarGroupSpacing);
    xScale = scaleLinear().domain([0, numWeeksMax]).range([0, numWeeksMax * daySquareSize]);
    yScale = scaleLinear()
        .domain([0, numWeekdaysMax])
        .range([numWeekdaysMax * daySquareSize, 0]);


    const year = max(years0),
        yearsData = range(min(years0), max(years0)+1),
        yearRectWidth = calendarSize.width / yearsData.length,
        daysDictionary = {},
        startDay = new Date("1/1/" + year),
        endDay = new Date("12/31/" + year);
    let dateIter = new Date("1/1/" + year),
        maxDays = timeDay.count(dateIter, endDay) + 1;

    for (let i = 0; i < maxDays; i++) {
        addDayEntryToDatasetForDate(daysDictionary, dateIter, -1);
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

    let monthNames = timeMonths(startDay, endDay);
    monthNames = monthNames.map(function (d) {
        return monthDateFormat(d);
    });

    let monthsData = [];
    let prevMaxX = 0;
    monthPathPoints.forEach(function(points, i) {
        let maxX = -1;
        points.forEach(function(point) {
            if(point[1]===-1) {
                if(point[0] > maxX) {
                    maxX = point[0];
                }
            }
        });

        monthsData.push({
            name: monthNames[i],
            x0: prevMaxX,
            width: (i===11 ? (numWeeksMax - prevMaxX) : (maxX - prevMaxX))});
        prevMaxX = maxX;
    });

    let monthLine = line()
        .x(function (d) {
            return xScale(d[0]);
        })
        .y(function (d) {
            return yScale(d[1]);
        })
        .curve(curveLinear);


    const daysData = Object.keys(daysDictionary).map(function (key) {
        return daysDictionary[key];
    });

    const weeksData = range(0, numWeeksMax);

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
            .attr("viewBox", "0 0 " + calendarSize.width + " " + calendarSize.height),
        svgOuterCalendar = svgRootCalendar.append("g")
            .attr("id", "calendarOuterSVG")
            .attr("pointer-events", "none")
            .attr("transform", "translate(" + calendarMargin.left + "," + calendarMargin.top + ")");

    svgInnerCalendar.append("rect")
        .attr("id", "innerCalendarBackground")
        .attr("width", calendarSize.width)
        .attr("height", calendarSize.height);

    svgOuterCalendar.append("rect")
        .attr("id", "outerCalendarBackground")
        .attr("width", calendarSize.width)
        .attr("height", calendarSize.height);


    const calendarDays = svgInnerCalendar.append('g').attr('id', 'calendarDays'),
        daySquares = calendarDays.selectAll("rect").data(daysData),
        path = calendarDays.selectAll("path").data(monthPathPoints),
        weeks = svgInnerCalendar.append('g').attr('id', 'calendarWeeks'),
        weekSquares = weeks.selectAll("rect").data(weeksData),
        months = svgInnerCalendar.append('g').attr('id', 'calendarMonths'),
        years = svgInnerCalendar.append('g').attr('id', 'calendarYears');

    let monthGroups = months.selectAll("g").data(monthsData);
    let yearGroups = years.selectAll("g").data(yearsData);

    daySquares.enter().append("rect")
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

    weekSquares.enter().append("rect")
        .attr("class", "week")
        .attr("y", yScale(-1) + calendarGroupSpacing)
        .attr("x", function (d) {
            return xScale(d);
        })
        .attr("height", daySquareSize)
        .attr("width", daySquareSize)
        .attr("fill", "#ccc");

    svgInnerCalendar.append("text")
        .attr("class", "gridRowLabel")
        .attr("x", xScale(-1.1))
        .attr("y", yScale(-1.8) + calendarGroupSpacing)
        .text("W");

    svgInnerCalendar.append("text")
        .attr("class", "gridRowLabel")
        .attr("x", xScale(-1.1))
        .attr("y", yScale(-2.8) + 2*calendarGroupSpacing)
        .text("M");

    svgInnerCalendar.append("text")
        .attr("class", "gridRowLabel")
        .attr("x", xScale(-1.1))
        .attr("y", yScale(-3.8) + 3*calendarGroupSpacing)
        .text("Y");

    monthGroups = monthGroups.enter().append("g");
    monthGroups.append("rect")
        .attr("class", "month")
        .attr("y", yScale(-2) + 2*calendarGroupSpacing)
        .attr("x", function(d) {
            return xScale(d.x0);
        })
        .attr("height", daySquareSize)
        .attr("width", function(d) {
            return xScale(d.width);
        })
        .attr("fill", "#ccc");
    monthGroups.append("text")
        .attr("class", "monthLabel")
        .attr("y", yScale(-2) + 2.6*calendarGroupSpacing + daySquareSize/2)
        .attr("x", function (d) {
            return xScale(d.x0) + xScale(d.width)/2.5;
        })
        .text(function(d) {return d.name.toUpperCase();});

    yearGroups = yearGroups.enter().append("g");
    yearGroups.append("rect")
        .attr("class", "year")
        .attr("y", yScale(-3) + 3*calendarGroupSpacing)
        .attr("x", function(d, i) {
            return i*yearRectWidth;
        })
        .attr("height", daySquareSize)
        .attr("width", yearRectWidth)
        .attr("fill", "#ccc");
    yearGroups.append("text")
        .attr("class", "yearLabel")
        .attr("y", yScale(-3) + 3.6*calendarGroupSpacing + daySquareSize/2)
        .attr("x", function(d, i) {
            return i*yearRectWidth + yearRectWidth/2.25;
        })
        .text(function(d) {return d;});

    let labelForWeekDay = {0: "M", 1: "T", 2: "W", 3: "T", 4: "F", 5: "S", 6: "S"};
    let weekdayLabelInfo = [];
    for (let j = 0; j < 7; j++) {
        let weekday = 6 - j - 0.75;
        let week = -1.1;
        weekdayLabelInfo.push({"week": week, "weekday": weekday, "label": labelForWeekDay[j]});
    }

    let weekdayText = svgInnerCalendar.selectAll("text.weekdayLabel").data(weekdayLabelInfo);

    weekdayText.enter().append("text")
        .attr("class", "gridRowLabel")
        .attr("x", function (d) {
            return xScale(d.week);
        })
        .attr("y", function (d) {
            return yScale(d.weekday);
        })
        .text(function (d) {
            return d.label.toUpperCase();
        });

}


export {makeCalendar};


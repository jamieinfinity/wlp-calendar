import {select, selectAll} from "d3-selection";
import {timeFormat, timeParse} from "d3-time-format";
import {scaleLinear} from "d3-scale";
import {timeDay, timeWeek, timeMonth, timeMonths} from "d3-time";
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

let selectedYear = 2017,
    daySquareSize,
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

function updateGrid(year, updateSelectedDateSpan) {

    const daysDictionary = {},
        startDay = new Date("1/1/" + year),
        endDay = new Date("12/31/" + year),
        maxDays = timeDay.count(startDay, endDay) + 1;

    let dateIter = new Date("1/1/" + year);
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
    monthPathPoints.forEach(function (points, i) {
        let maxX = -1;
        points.forEach(function (point) {
            if (point[1] === -1) {
                if (point[0] > maxX) {
                    maxX = point[0];
                }
            }
        });

        monthsData.push({
            name: monthNames[i],
            x0: prevMaxX,
            width: (i === 11 ? (numWeeksMax - prevMaxX) : (maxX - prevMaxX))
        });
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

    const calendarDays = select('#calendarDays'),
        daySquares = calendarDays.selectAll("rect").data(daysData),
        path = calendarDays.selectAll("path").data(monthPathPoints),
        weeks = select('#calendarWeeks'),
        weekSquares = weeks.selectAll("rect").data(weeksData),
        monthGroups = select('#calendarMonths').selectAll("g").data(monthsData);

    daySquares.enter().append("rect")
        .attr("class", "day")
        .attr("height", daySquareSize)
        .attr("width", daySquareSize)
        .attr("fill", "#ccc")
        .merge(daySquares)
        .attr("y", function (d) {
            return yScale(d.weekday);
        })
        .attr("x", function (d) {
            return xScale(d.week);
        })
        .on("click", function (d) {
            const startDate = new Date(d.date + ' 00:00:00');
            const endDate = timeDay.offset(startDate, 1);

            selectAll('#calendarRootSVG').selectAll('rect.selected').classed('selected', false);
            select(this).classed('selected', true);
            this.parentNode.appendChild(this);

            updateSelectedDateSpan([startDate, endDate]);
        });
    daySquares.exit().remove();

    path.enter().append("path")
        .attr("fill", "none")
        .merge(path)
        .attr("d", monthLine);
    path.exit().remove();

    weekSquares.enter().append("rect")
        .attr("class", "week")
        .attr("height", daySquareSize)
        .attr("width", daySquareSize)
        .attr("fill", "#ccc")
        .merge(weekSquares)
        .attr("y", yScale(-1) + calendarGroupSpacing)
        .attr("x", function (d) {
            return xScale(d);
        })
        .on("click", function (d) {
            let parseWeek = timeParse('%Y-%W');
            const startDate = parseWeek(year + '-' + d);
            const endDate = timeDay.offset(timeWeek.ceil(startDate), 1);

            selectAll('#calendarRootSVG').selectAll('rect.selected').classed('selected', false);
            select(this).classed('selected', true);
            this.parentNode.appendChild(this);

            updateSelectedDateSpan([startDate, endDate]);
        });
    weekSquares.exit().remove();

    let monthGroupsNew = monthGroups.enter().append("g")
        .on("click", function (d) {
            const monthDate = new Date(d.name + ' 15 ' + selectedYear);
            const startDate = timeMonth.floor(monthDate);
            const endDate = timeMonth.ceil(monthDate);

            selectAll('#calendarRootSVG').selectAll('rect.selected').classed('selected', false);
            select(this).select('rect')
                .classed('selected', true);
            this.parentNode.appendChild(this);

            updateSelectedDateSpan([startDate, endDate]);
        });
    monthGroupsNew.merge(monthGroups);
    monthGroupsNew.append("rect")
        .attr("class", "month")
        .attr("height", daySquareSize)
        .attr("fill", "#ccc")
        .merge(monthGroups.select(".month"))
        .attr("y", yScale(-2) + 2 * calendarGroupSpacing)
        .attr("x", function (d) {
            return xScale(d.x0);
        })
        .attr("width", function (d) {
            return xScale(d.width);
        });
    monthGroupsNew.append("text")
        .attr("class", "monthLabel")
        .merge(monthGroups.select(".monthLabel"))
        .attr("pointer-events", "none")
        .attr("y", yScale(-2) + 2.6 * calendarGroupSpacing + daySquareSize / 2)
        .attr("x", function (d) {
            return xScale(d.x0) + xScale(d.width) / 2.5;
        })
        .text(function (d) {
            return d.name.toUpperCase();
        });
    monthGroups.exit().remove();
}


function makeCalendar(domElementID, width, years0, updateSelectedDateSpan) {
    selectedYear = max(years0);

    calendarSize.width = width - calendarMargin.left - calendarMargin.right;
    daySquareSize = calendarSize.width / numWeeksMax;
    calendarSize.height = daySquareSize * (numWeekdaysMax + 1) + 3 * (daySquareSize + calendarGroupSpacing);
    xScale = scaleLinear().domain([0, numWeeksMax]).range([0, numWeeksMax * daySquareSize]);
    yScale = scaleLinear()
        .domain([0, numWeekdaysMax])
        .range([numWeekdaysMax * daySquareSize, 0]);

    const yearsData = range(min(years0), max(years0) + 1),
        yearRectWidth = calendarSize.width / yearsData.length,
        container = select(domElementID).append("div")
            .attr("id", "calendarContainer"),
        root = container.append("div")
            .attr("id", "calendarRootDiv"),
        svgRootCalendar = root.append("svg")
            .attr("id", "calendarRootSVG")
            .attr("width", calendarSize.width + calendarMargin.left + calendarMargin.right)
            .attr("height", calendarSize.height + calendarMargin.top + calendarMargin.bottom),
        svgOuterCalendar = svgRootCalendar.append("g")
            .attr("id", "calendarOuterSVG")
            .attr("pointer-events", "none")
            .attr("transform", "translate(" + calendarMargin.left + "," + calendarMargin.top + ")"),
        svgInnerCalendar = svgRootCalendar.append("svg")
            .attr("id", "calendarInnerSVG")
            .attr("vector-effect", "non-scaling-stroke")
            .attr("width", calendarSize.width)
            .attr("height", calendarSize.height)
            .attr("x", calendarMargin.left)
            .attr("y", calendarMargin.top)
            .attr("viewBox", "0 0 " + calendarSize.width + " " + calendarSize.height);

    svgOuterCalendar.append("rect")
        .attr("id", "outerCalendarBackground")
        .attr("width", calendarSize.width)
        .attr("height", calendarSize.height);

    svgInnerCalendar.append("rect")
        .attr("id", "innerCalendarBackground")
        .attr("width", calendarSize.width)
        .attr("height", calendarSize.height);

    svgInnerCalendar.append('g').attr('id', 'calendarDays');
    svgInnerCalendar.append('g').attr('id', 'calendarWeeks');
    svgInnerCalendar.append('g').attr('id', 'calendarMonths');

    updateGrid(selectedYear, updateSelectedDateSpan);

    let yearGroups = svgInnerCalendar.append('g').attr('id', 'calendarYears').selectAll("g").data(yearsData);

    svgInnerCalendar.append("text")
        .attr("class", "gridRowLabel")
        .attr("x", xScale(-1.1))
        .attr("y", yScale(-1.8) + calendarGroupSpacing)
        .text("W");

    svgInnerCalendar.append("text")
        .attr("class", "gridRowLabel")
        .attr("x", xScale(-1.1))
        .attr("y", yScale(-2.8) + 2 * calendarGroupSpacing)
        .text("M");

    svgInnerCalendar.append("text")
        .attr("class", "gridRowLabel")
        .attr("x", xScale(-1.1))
        .attr("y", yScale(-3.8) + 3 * calendarGroupSpacing)
        .text("Y");

    yearGroups = yearGroups.enter().append("g")
        .on("click", function (d) {
            selectedYear = d;

            updateGrid(d, updateSelectedDateSpan);
            const startDate = new Date(d, 0, 1, 0, 0, 0);
            const endDate = new Date(d + 1, 0, 1, 0, 0, 0);

            selectAll('#calendarRootSVG').selectAll('rect.selected').classed('selected', false);
            select('#calendarYears').selectAll('text').attr('class', function (d) {
                if (d === selectedYear) {
                    return 'yearLabel selected'
                }
                return 'yearLabel';
            });
            select(this).select('rect')
                .classed('selected', true);
            this.parentNode.appendChild(this);

            updateSelectedDateSpan([startDate, endDate]);
        });
    yearGroups.append("rect")
        .attr("class", "year")
        .attr("y", yScale(-3) + 3 * calendarGroupSpacing)
        .attr("x", function (d, i) {
            return i * yearRectWidth;
        })
        .attr("height", daySquareSize)
        .attr("width", yearRectWidth)
        .attr("fill", "#ccc");
    yearGroups.append("text")
        .attr('class', function (d) {
            if (d === selectedYear) {
                return 'yearLabel selected'
            }
            return 'yearLabel';
        })
        .attr("y", yScale(-3) + 3.6 * calendarGroupSpacing + daySquareSize / 2)
        .attr("x", function (d, i) {
            return i * yearRectWidth + yearRectWidth / 2.25;
        })
        .text(function (d) {
            return d;
        });

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


import {select, selectAll} from "d3-selection";
import {timeFormat, timeParse} from "d3-time-format";
import {scaleLinear, scaleSequential} from "d3-scale";
import {interpolateBlues} from "d3-scale-chromatic";
import {timeDay, timeWeek, timeMonth, timeMonths} from "d3-time";
import {line, curveLinear} from "d3-shape";
import {range, max, min, mean} from "d3-array";
import {nest} from "d3-collection";

// TODO: Choose color palette
// https://github.com/d3/d3-scale-chromatic
// https://blog.graphiq.com/finding-the-right-color-palettes-for-data-visualizations-fcd4e707a283
// http://tristen.ca/hcl-picker/#/clh/12/22/7D3203/FAD7B4
// http://bl.ocks.org/jfreyre/b1882159636cc9e1283a
// https://www.pinterest.com/pin/395261304766413148/
// https://www.pinterest.com/pin/157485318196050590/
// TODO: Put date range data in grid data arrays rather than computing in on('click')

const prettyDateFormat = timeFormat("%B %e, %Y"),
    monthAbbrevForDate = timeFormat("%b"),
    weekdayForDate = timeFormat("%w"), // Sunday = 0
    dayNumForDate = timeFormat("%j"),
    weekNumForDate = timeFormat("%W"),
    monthNumForDate = timeFormat("%m"),
    yearNumForDate = timeFormat("%Y"),
    parseWeek = timeParse('%Y-%W'),
    colorMap = scaleSequential(interpolateBlues),
    numWeeksMax = 53,
    numWeekdaysMax = 6,
    calendarGroupSpacing = 5,
    calendarMargin = {top: 10, right: 15, bottom: 10, left: 100},
    calendarSize = {height: 0, width: 0};

let selectedYear = 2017,
    dayGridSquareSize,
    dayGridXScale,
    dayGridYScale,
    measurementData = {},
    updateSelectedDateSpanRef;


function weekdayNumForDate(date) {
    const weekday = (Number(weekdayForDate(date)) === 0) ? numWeekdaysMax : Number(weekdayForDate(date)) - 1;
    return 6 - weekday;
}

function calendarCoodinateForDate(date) {
    return {"week": parseInt(weekNumForDate(date)), "weekday": weekdayNumForDate(date)};
}

function getMeasurementValue(year, type, key) {
    if ('data' in measurementData) {
        if (year in measurementData['data']) {
            if (key in measurementData['data'][year][type]) {
                return measurementData['data'][year][type][key];
            } else {
                return null;
            }
        } else {
            return null;
        }
    } else {
        return null;
    }
}

function addDayEntryToDatasetForDate(dataset, date) {
    const keyYear = yearNumForDate(date),
        entry = calendarCoodinateForDate(date),
        key = keyYear + ":" + entry.week + ":" + entry.weekday;
    entry["measurement"] = getMeasurementValue(keyYear, 'days', parseInt(dayNumForDate(date)));
    entry["date"] = prettyDateFormat(date);
    dataset[key] = entry;
}

function getMonthPathData(year) {
    const monthPathPoints = [];

    for (let m = 0; m < 12; m++) {
        const pathPoints = [],
            yMin = -1,
            yMax = 6,
            startDay = new Date(year, m, 1),
            startCoordinate = calendarCoodinateForDate(startDay),
            endDay = new Date(year, m + 1, 0),
            endCoordinate = calendarCoodinateForDate(endDay);

        pathPoints[0] = [startCoordinate.week, startCoordinate.weekday];
        pathPoints[1] = [startCoordinate.week + 1, startCoordinate.weekday];
        pathPoints[2] = [startCoordinate.week + 1, yMax];
        pathPoints[3] = [endCoordinate.week, yMax];
        pathPoints[4] = [endCoordinate.week + 1, yMax];
        pathPoints[5] = [endCoordinate.week + 1, endCoordinate.weekday - 1];
        pathPoints[6] = [endCoordinate.week, endCoordinate.weekday - 1];
        pathPoints[7] = [endCoordinate.week, yMin];
        pathPoints[8] = [startCoordinate.week, yMin];

        monthPathPoints.push(pathPoints);
    }
    return monthPathPoints;
}

function getMonthGridData(year, monthPathData) {
    const startDay = new Date("1/1/" + year),
        endDay = new Date("12/31/" + year);
    let monthNames = timeMonths(startDay, endDay),
        monthsData = [],
        prevMaxX = 0;

    monthNames = monthNames.map(d => monthAbbrevForDate(d));

    monthPathData.forEach((points, i) => {
        let maxX = -1;
        points.forEach(point => {
            if (point[1] === -1) {
                if (point[0] > maxX) {
                    maxX = point[0];
                }
            }
        });
        monthsData.push({
            measurement: getMeasurementValue(year, 'months', i),
            name: monthNames[i],
            x0: prevMaxX,
            width: (i === 11 ? (numWeeksMax - prevMaxX) : (maxX - prevMaxX))
        });
        prevMaxX = maxX;
    });
    return monthsData;
}

function getDaysDictionary(year) {
    const daysDictionary = {},
        startDay = new Date("1/1/" + year),
        endDay = new Date("12/31/" + year),
        maxDays = timeDay.count(startDay, endDay) + 1;

    let dateIter = new Date("1/1/" + year);
    for (let i = 0; i < maxDays; i++) {
        addDayEntryToDatasetForDate(daysDictionary, dateIter);
        dateIter.setDate(dateIter.getDate() + 1);
    }
    return daysDictionary;
}

function getDayGridData(year) {
    const daysDictionary = getDaysDictionary(year);
    return Object.keys(daysDictionary).map(key => daysDictionary[key]);
}


function updateGridDays(daysData, monthPathData, updateSelectedDateSpan) {
    const calendarDays = select('#calendarDays'),
        path = calendarDays.selectAll("path").data(monthPathData),
        daySquares = calendarDays.selectAll("rect").data(daysData),
        monthLine = line()
            .x(d => dayGridXScale(d[0]))
            .y(d => dayGridYScale(d[1]))
            .curve(curveLinear);

    daySquares.enter().append("rect")
        .attr("class", "day")
        .attr("height", dayGridSquareSize)
        .attr("width", dayGridSquareSize)
        .merge(daySquares)
        .attr("fill", d => {
            return d.measurement ? colorMap(d.measurement) : "#ccc";
        })
        .attr("y", d => dayGridYScale(d.weekday))
        .attr("x", d => dayGridXScale(d.week))
        .on("click", function (d) {
            const startDate = new Date(d.date + ' 00:00:00'),
                endDate = timeDay.offset(startDate, 1);

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
}

function updateGridMonths(monthsData, updateSelectedDateSpan) {
    const monthGroups = select('#calendarMonths').selectAll("g").data(monthsData);

    let monthGroupsNew = monthGroups.enter().append("g")
        .on("click", function (d) {
            const monthDate = new Date(d.name + ' 15 ' + selectedYear),
                startDate = timeMonth.floor(monthDate),
                endDate = timeMonth.ceil(monthDate);

            selectAll('#calendarRootSVG').selectAll('rect.selected').classed('selected', false);
            select(this).select('rect')
                .classed('selected', true);
            this.parentNode.appendChild(this);

            updateSelectedDateSpan([startDate, endDate]);
        });
    monthGroupsNew.merge(monthGroups);
    monthGroupsNew.append("rect")
        .attr("class", "month")
        .attr("height", dayGridSquareSize)
        .merge(monthGroups.select(".month"))
        .attr("fill", d => {
            return d.measurement ? colorMap(d.measurement) : "#ccc";
        })
        .attr("y", dayGridYScale(-2) + 2 * calendarGroupSpacing)
        .attr("x", d => dayGridXScale(d.x0))
        .attr("width", d => dayGridXScale(d.width));
    monthGroupsNew.append("text")
        .attr("class", "monthLabel")
        .merge(monthGroups.select(".monthLabel"))
        .attr("pointer-events", "none")
        .attr("y", dayGridYScale(-2) + 2.6 * calendarGroupSpacing + dayGridSquareSize / 2)
        .attr("x", d => dayGridXScale(d.x0) + dayGridXScale(d.width) / 2.5)
        .text(d => d.name.toUpperCase());
    monthGroups.exit().remove();
}


function updateGridWeeks(year, weeksData, updateSelectedDateSpan) {
    const weeks = select('#calendarWeeks'),
        weekSquares = weeks.selectAll("rect").data(weeksData);

    weekSquares.enter().append("rect")
        .attr("class", "week")
        .attr("height", dayGridSquareSize)
        .attr("width", dayGridSquareSize)
        .merge(weekSquares)
        .attr("fill", d => {
            const measurement = getMeasurementValue(year, 'weeks', d);
            return measurement ? colorMap(measurement) : "#ccc";
        })
        .attr("y", dayGridYScale(-1) + calendarGroupSpacing)
        .attr("x", d => dayGridXScale(d))
        .on("click", function (d) {
            const startDate = parseWeek(year + '-' + d),
                endDate = timeDay.offset(timeWeek.ceil(startDate), 1);

            selectAll('#calendarRootSVG').selectAll('rect.selected').classed('selected', false);
            select(this).classed('selected', true);
            this.parentNode.appendChild(this);

            updateSelectedDateSpan([startDate, endDate]);
        });
    weekSquares.exit().remove();
}

function updateGrid(year, updateSelectedDateSpan) {
    const daysData = getDayGridData(year),
        weeksData = range(0, numWeeksMax),
        monthPathData = getMonthPathData(year),
        monthsData = getMonthGridData(year, monthPathData);

    updateGridDays(daysData, monthPathData, updateSelectedDateSpan);
    updateGridWeeks(year, weeksData, updateSelectedDateSpan);
    updateGridMonths(monthsData, updateSelectedDateSpan);
}

function updateGridYears(years, updateSelectedDateSpan) {
    const yearsData = range(min(years), max(years) + 1),
        yearRectWidth = calendarSize.width / yearsData.length,
        yearGroups = select('#calendarInnerSVG').append('g').attr('id', 'calendarYears').selectAll("g").data(yearsData);

    let yearGroupsNew = yearGroups.enter().append("g")
        .on("click", function (d) {
            selectedYear = d;

            updateGrid(d, updateSelectedDateSpan);
            const startDate = new Date(d, 0, 1, 0, 0, 0),
                endDate = new Date(d + 1, 0, 1, 0, 0, 0);

            selectAll('#calendarRootSVG').selectAll('rect.selected').classed('selected', false);
            selectAll('#calendarRootSVG').selectAll('text.selected').classed('selected', false);
            select('#calendarYears').selectAll('text').attr('class', function (d) {
                if (d === selectedYear) {
                    return 'yearLabel selected';
                }
                return 'yearLabel';
            });
            select(this).select('rect')
                .classed('selected', true);
            select(this).select('text')
                .classed('selected', true);
            this.parentNode.appendChild(this);

            updateSelectedDateSpan([startDate, endDate]);
        });
    yearGroupsNew.merge(yearGroups);
    yearGroupsNew.append("rect")
        .attr("class", "year")
        .attr("y", dayGridYScale(-3) + 3 * calendarGroupSpacing)
        .attr("x", (d, i) => i * yearRectWidth)
        .attr("height", dayGridSquareSize)
        .attr("width", yearRectWidth)
        .attr("fill", d => {
            const measurement = getMeasurementValue(d, 'years', d);
            return measurement ? colorMap(measurement) : "#ccc";
        });
    yearGroupsNew.append("text")
        .attr('class', d => (d===selectedYear) ? 'yearLabel selected' : 'yearLabel')
        .attr("y", dayGridYScale(-3) + 3.6 * calendarGroupSpacing + dayGridSquareSize / 2)
        .attr("x", (d, i) => i * yearRectWidth + yearRectWidth / 2.25)
        .text(d => d);
    yearGroups.exit().remove();
}

function getWeekDayLabelData() {
    const labelForWeekDay = {0: "M", 1: "T", 2: "W", 3: "T", 4: "F", 5: "S", 6: "S"},
        weekdayLabelInfo = [];

    for (let j = 0; j < 7; j++) {
        const weekday = 6 - j - 0.75,
            week = -1.1;
        weekdayLabelInfo.push({"week": week, "weekday": weekday, "label": labelForWeekDay[j]});
    }
    return weekdayLabelInfo;
}

function makeCalendar(domElementID, width, years0, updateSelectedDateSpan) {
    updateSelectedDateSpanRef = updateSelectedDateSpan;

    selectedYear = max(years0);
    calendarSize.width = width - calendarMargin.left - calendarMargin.right;
    dayGridSquareSize = calendarSize.width / numWeeksMax;
    calendarSize.height = dayGridSquareSize * (numWeekdaysMax + 1) + 3 * (dayGridSquareSize + calendarGroupSpacing);
    dayGridXScale = scaleLinear().domain([0, numWeeksMax]).range([0, numWeeksMax * dayGridSquareSize]);
    dayGridYScale = scaleLinear()
        .domain([0, numWeekdaysMax])
        .range([numWeekdaysMax * dayGridSquareSize, 0]);

    const container = select(domElementID).append("div")
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
            .attr("viewBox", "0 0 " + calendarSize.width + " " + calendarSize.height),
        weekdayLabelInfo = getWeekDayLabelData(),
        weekdayText = svgInnerCalendar.selectAll("text.weekdayLabel").data(weekdayLabelInfo);

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

    weekdayText.enter().append("text")
        .attr("class", "gridRowLabel")
        .attr("x", d => dayGridXScale(d.week))
        .attr("y", d => dayGridYScale(d.weekday))
        .text(d => d.label.toUpperCase());

    svgInnerCalendar.append("text")
        .attr("class", "gridRowLabel")
        .attr("x", dayGridXScale(-1.1))
        .attr("y", dayGridYScale(-1.8) + calendarGroupSpacing)
        .text("W");

    svgInnerCalendar.append("text")
        .attr("class", "gridRowLabel")
        .attr("x", dayGridXScale(-1.1))
        .attr("y", dayGridYScale(-2.8) + 2 * calendarGroupSpacing)
        .text("M");

    svgInnerCalendar.append("text")
        .attr("class", "gridRowLabel")
        .attr("x", dayGridXScale(-1.1))
        .attr("y", dayGridYScale(-3.8) + 3 * calendarGroupSpacing)
        .text("Y");

    updateGridYears(years0, updateSelectedDateSpan);
}


function getMeasurementDataForPeriod(data, getPeriod) {
    const rollupData = nest().key(d => parseInt(getPeriod(d.timestamp)))
            .rollup(d1 => mean(d1, d2 => d2.measurementValue))
            .entries(data),
        periodData = {};
    rollupData.forEach(d => periodData[d['key']] = d['value']);
    return periodData;
}

function getMeasurementData(data) {
    const rollupData = nest().key(d => d.timestamp.getFullYear())
            .entries(data),
        measurementData = {};
    rollupData.forEach(d => {
        measurementData[d['key']] =
            {
                'days': getMeasurementDataForPeriod(d['values'], dayNumForDate),
                'weeks': getMeasurementDataForPeriod(d['values'], weekNumForDate),
                'months': getMeasurementDataForPeriod(d['values'], d => (monthNumForDate(d) - 1)),
                'years': getMeasurementDataForPeriod(d['values'], yearNumForDate)
            };
    });
    return measurementData;
}


function updateFeed(feed) {
    measurementData['measurementMinimum'] = feed.feedInfo.measurementMinimum;
    measurementData['measurementMaximum'] = feed.feedInfo.measurementMaximum;
    measurementData['data'] = getMeasurementData(feed.data);

    colorMap.domain([feed.feedInfo.measurementMinimum, feed.feedInfo.measurementMaximum]);

    updateGrid(selectedYear, updateSelectedDateSpanRef);
    let years = Object.keys(measurementData['data']).map(d=>parseInt(d));
    updateGridYears(years, updateSelectedDateSpanRef);
}

export {makeCalendar, updateFeed};


import {select} from "d3-selection";


function makeCalendar(domElementID) {
    select(domElementID).append("div")
        .attr("id", "calendarContainer");
    select("#calendarContainer").append("div")
        .attr("id", "yearContainer");

    let years = [2015, 2016, 2017];

    select("#yearContainer").selectAll('div').data(years).enter().append('div')
        .attr('class', 'yearDiv')
        .text(function(d) {
            return d;
        })
        .on('click', () => {});

}


export {makeCalendar};


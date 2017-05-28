import {select} from "d3-selection";


function makeCalendar(domElementID) {
    const container = select(domElementID).append("div")
        .attr("id", "calendarContainer");

    container.append("div")
        .attr("id", "yearDiv");
}


export {makeCalendar};


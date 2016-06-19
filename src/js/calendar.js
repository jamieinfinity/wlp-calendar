/*global d3*/
/*global d3_tip*/


import viewModel from "./viewModel";
import d3 from "d3";
import d3Tip from "d3-tip";

export {drawCalendar, addData, resizeCalendar};

const model = viewModel();

const calendarMargin = {top: 20, right: 20, bottom: 30, left: 20};
const calendarSize = {
    height: 70 - calendarMargin.top - calendarMargin.bottom,
    width: 0
};

let prettyDateFormat = d3.time.format("%a %b %e, %Y at %_I:%M %p");

function calendarExtentDates() {
    let minDate = sharedTimeScale.invert(0);
    let maxDate = sharedTimeScale.invert(calendarSize.width);
    return [minDate, maxDate];
}

function drawCalendar(domElementID, width) {

}

function addData(data) {

}

function resizeCalendar(width) {

}

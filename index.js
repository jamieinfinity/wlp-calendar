export {drawCalendar, addData, resizeCalendar} from "./src/js/calendar";
// I don't want to expose viewModel on public interface, but I don't know how else
// to set things up
export {default as viewModel} from "./src/js/viewModel";
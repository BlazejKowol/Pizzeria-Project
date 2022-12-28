import { select, templates, settings, classNames } from '../settings.js';
import utils from '../utils.js';
import AmountWidget from '../components/AmountWidget.js';
import DatePicker from './DatePicker.js';
import HourPicker from './HourPicker.js';

class Booking {
  constructor(element) {
    const thisBooking = this;

    thisBooking.pickedTable = null;
    thisBooking.starters = [];

    thisBooking.render(element);
    thisBooking.initWidgets();
    thisBooking.getData();
  }

  getData(){
    const thisBooking = this;

    const startDateParam = settings.db.dateStartParamKey + '=' + utils.dateToStr(thisBooking.datePicker.minDate);
    const endDateParam = settings.db.dateEndParamKey + '=' + utils.dateToStr(thisBooking.datePicker.maxDate);

    const params = {
      booking: [
        startDateParam,
        endDateParam,
      ],
      eventsCurrent: [
        settings.db.notRepeatParam,
        startDateParam,
        endDateParam,
      ],
      eventsRepeat: [
        settings.db.repeatParam,
        endDateParam,
      ],
    };

    //console.log('get Data params', params);

    const urls = {
      booking:       settings.db.url + '/' + settings.db.bookings 
                     + '?' + params.booking.join('&'),
      eventsCurrent: settings.db.url + '/' + settings.db.events   
                     + '?' + params.eventsCurrent.join('&'),
      eventsRepeat:  settings.db.url + '/' + settings.db.events  
                     + '?' + params.eventsRepeat.join('&')
    };

    //console.log('Urls', urls);

    Promise.all([
      fetch(urls.booking),
      fetch(urls.eventsCurrent),
      fetch(urls.eventsRepeat),
    ])
      .then(function(allResponses){
        const bookingsResponse = allResponses[0];
        const eventsCurrentResponse = allResponses[1];
        const eventsRepeatResponse = allResponses[2];
        return Promise.all([
          bookingsResponse.json(),
          eventsCurrentResponse.json(),
          eventsRepeatResponse.json(),
        ]);
      }) 
      .then(function([bookings, eventsCurrent, eventsRepeat]){
        //console.log(bookings); 
        //console.log(eventsCurrent);
        //console.log(eventsRepeat);
        thisBooking.parseData(bookings, eventsCurrent, eventsRepeat);
      });
  }

  parseData(bookings, eventsCurrent, eventsRepeat){
    const thisBooking = this;

    thisBooking.booked = {};

    for(let item of bookings){
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    for(let item of eventsCurrent){
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    const minDate = thisBooking.datePicker.minDate; 
    const maxDate = thisBooking.datePicker.maxDate;

    for(let item of eventsRepeat){
      if(item.repeat == 'daily'){
        for(let loopDate = minDate; loopDate <= maxDate; loopDate = utils.addDays(loopDate, 1)){
          thisBooking.makeBooked(utils.dateToStr(loopDate), item.hour, item.duration, item.table);
        }
      }
    }

    //console.log('this booking booked', thisBooking.booked);

    thisBooking.updateDOM();
  }

  makeBooked(date, hour, duration, table){
    const thisBooking = this;

    if(typeof thisBooking.booked[date] == 'undefined'){
      thisBooking.booked[date] = {};
    }

    const startHour = utils.hourToNumber(hour);

    for(let hourBlock = startHour; hourBlock < startHour + duration; hourBlock += 0.5){
      //console.log('loop', hourBlock);

      if(typeof thisBooking.booked[date][hourBlock] == 'undefined'){
        thisBooking.booked[date][hourBlock] = [];
      }

      thisBooking.booked[date][hourBlock].push(table);
    }
  }

  updateDOM(){
    const thisBooking = this;

    thisBooking.date = thisBooking.datePicker.value;
    thisBooking.hour = utils.hourToNumber(thisBooking.hourPicker.value);
    
    let allAvailable = false;

    if(
      typeof thisBooking.booked[thisBooking.date] == 'undefined'
      ||
      typeof thisBooking.booked[thisBooking.date][thisBooking.hour] == 'undefined'
    ){
      allAvailable = true;
    }

    for(let table of thisBooking.dom.tables){
      let tableId = table.getAttribute(settings.booking.tableIdAttribute);
      if(!isNaN(tableId)){
        tableId = parseInt(tableId);
      }

      if(
        !allAvailable
        &&
        thisBooking.booked[thisBooking.date][thisBooking.hour].includes(tableId)
      ){
        table.classList.add(classNames.booking.tableBooked);
      } else{
        table.classList.remove(classNames.booking.tableBooked);
      }
    }
  }

  render(element){
    const thisBooking = this;

    const generatedHTML = templates.bookingWidget();

    thisBooking.dom = {};
    thisBooking.dom.wrapper = element;
    thisBooking.dom.wrapper.innerHTML = generatedHTML;

    thisBooking.dom.peopleAmount = thisBooking.dom.wrapper.querySelector(
      select.booking.peopleAmount);
    thisBooking.dom.hoursAmount = thisBooking.dom.wrapper.querySelector(
      select.booking.hoursAmount);  
    thisBooking.dom.datePicker = thisBooking.dom.wrapper.querySelector(
      select.widgets.datePicker.wrapper);
    thisBooking.dom.hourPicker = thisBooking.dom.wrapper.querySelector(
      select.widgets.hourPicker.wrapper);
    thisBooking.dom.tables = thisBooking.dom.wrapper.querySelectorAll(
      select.booking.tables);
    thisBooking.dom.allTables = thisBooking.dom.wrapper.querySelector(
      select.containerOf.tables);
    thisBooking.dom.duration = thisBooking.dom.wrapper.querySelector(
      select.booking.duration);
    thisBooking.dom.people = thisBooking.dom.wrapper.querySelector(
      select.booking.people);
    thisBooking.dom.phone = thisBooking.dom.wrapper.querySelector(
      select.booking.phone);
    thisBooking.dom.address = thisBooking.dom.wrapper.querySelector(
      select.booking.address);
    thisBooking.dom.starters = thisBooking.dom.wrapper.querySelectorAll(
      select.booking.starters);
    thisBooking.dom.form = thisBooking.dom.wrapper.querySelector(
      select.booking.form);
    thisBooking.dom.formSubmit = thisBooking.dom.wrapper.querySelector(
      select.booking.formSubmit);      
  }

  initWidgets(){
    const thisBooking = this;

    thisBooking.peopleAmount = new AmountWidget(thisBooking.dom.peopleAmount);
    thisBooking.dom.peopleAmount.addEventListener('updated', function(){});

    thisBooking.hoursAmount = new AmountWidget(thisBooking.dom.hoursAmount);
    thisBooking.dom.hoursAmount.addEventListener('updated', function(){});

    thisBooking.datePicker = new DatePicker(thisBooking.dom.datePicker);
    thisBooking.dom.datePicker.addEventListener('updated', function(){});

    thisBooking.hourPicker = new HourPicker(thisBooking.dom.hourPicker);
    thisBooking.dom.hourPicker.addEventListener('updated', function(){});

    thisBooking.dom.wrapper.addEventListener('updated', function(event){
      thisBooking.updateDOM();
      if(event.target == 
      thisBooking.peopleAmount, 
      thisBooking.hoursAmount, 
      thisBooking.datePicker,
      thisBooking.hourPicker){
        for(let table of thisBooking.dom.tables){
          table.classList.remove(classNames.booking.selected);
        }
      }
    });

    /*thisBooking.dom.allTables.addEventListener('click', function(){
      thisBooking.initTables();
    });*/

    thisBooking.dom.form.addEventListener('submit', function(event){
      event.preventDefault();
      thisBooking.sendBooking();
    });

    thisBooking.initTables();
  }

  initTables(){
    const thisBooking = this;

    thisBooking.dom.allTables.addEventListener('click', function(event){
      event.preventDefault();
    
      if(event.target.classList.contains('table')){
        if(!event.target.classList.contains(classNames.booking.tableBooked)){
          for(let table of thisBooking.dom.tables){
            if(/*table.classList.contains(classNames.booking.selected) &&*/
              table !== event.target){ 
              table.classList.remove(classNames.booking.selected);
            } else {
              event.target.classList.toggle(classNames.booking.selected);
              if(event.target.classList.contains(classNames.booking.selected)){
                thisBooking.pickedTable = event.target.getAttribute('data-table');
              } else {
                thisBooking.pickedTable = null;
              }          
            }
          }
        } else {
          alert('Not Available');
        }
      }
    });

    /*thisBooking.dom.allTables.addEventListener('click', function(event){
      event.preventDefault();
      const tableId = event.target.getAttribute(select.booking.tables);
      if(!event.target.classList.contains(classNames.booking.tableBooked)){
        for(let table of thisBooking.dom.tables){
            if(table.classList.contains(classNames.booking.selected)){;
            table.classList.remove(classNames.booking.selected)
            thisBooking.pickedTables.push(table);
        } else {
          alert('Not Available');
        }
      }
    });*/
  }

  sendBooking(){
    const thisBooking = this;

    const url = settings.db.url + '/' + settings.db.bookings;

    const payload = {
      date: thisBooking.date,
      hour: utils.numberToHour(thisBooking.hour),
      table: parseInt(thisBooking.pickedTable),
      duration: thisBooking.hoursAmount.value,
      people: thisBooking.peopleAmount.value,
      starters: [],
      phone: thisBooking.dom.phone.value,
      address: thisBooking.dom.address.value,
    };

    /*thisBooking.dom.starters.addEventListener('click', function(event){
      if(event.target.tagName == 'INPUT' &&
          event.target.type == 'checkbox' &&
          event.target.name == 'starter'){
        console.log(event.target.value);
        if(event.target.checked == true) {
          thisBooking.payload.starters.push(event.target.value);
        } else {
          thisBooking.payload.starters.indexOf(event.target.value);
          thisBooking.payload.starters.splice(event.target.value, 1);
        }
        console.log('starters', thisBooking.payload.starters);
      }
    });*/

    for(let starter of thisBooking.dom.starters) {
      if(starter.checked){
        payload.starters.push(starter.value);
      }
    }


    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    };

    fetch(url, options)
      .then(rawResponse => rawResponse.json())
      .then(parsedResponse => {
        console.log('Parsed Response', parsedResponse);
        /*thisBooking.makeBooked(
          parsedResponse.date,
          parsedResponse.hour,
          parsedResponse.duration,
          parsedResponse.table
        );
        thisBooking.updateDOM();*/
      });   
  }
}

export default Booking;
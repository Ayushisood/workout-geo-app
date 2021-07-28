'use strict';
import 'core-js/stable';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

const modalHeader = document.querySelector('.modal__header');
const modalBtn = document.querySelector('.delete--data');

const modal = document.querySelector('.modal');
const overlay = document.querySelector('.overlay');
const btnCloseModal = document.querySelector('.btn--close-modal');
const deleteDataBtn = document.querySelector('.delete--data');

class Workout {
  //parent class of type of workout
  date = new Date();
  id = (Date.now() + '').slice(-10); //for making id unique dynamically
  //or can use Math.floor(Math.random() * 10000) for unique id generator

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat,lng]
    this.distance = distance; //km
    this.duration = duration; //min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

//child classes
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

/////////////////////////////////////////////////////
// APPLICATION ARCHITECTURE
class App {
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];

  constructor() {
    //get user's position
    this._getPosition();

    //add data to map from local storage
    this._addDataFromLS();

    //attach event handlers
    //handling form event on map when there is submission of date on form
    form.addEventListener('submit', this._newWorkOut.bind(this));

    //change the elevation gain to/from cadence according to the input type
    inputType.addEventListener('change', this._toggleElevationField); //no need to bind this keyword here as this callback function is not using this keyword in its code

    containerWorkouts.addEventListener(
      'click',
      this._moveToClickedLocation.bind(this)
    ); //move to the clicked location on map

    if (!localStorage.length) return;
    //open modal window
    this.deleteWindow();
    deleteDataBtn.addEventListener('click', this.resetData);
  }

  _getPosition() {
    if (navigator.geolocation) {
      //Geolocation API for gettig current location and have two callback functions
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this), //use bind with this callback function, because getCurrentPosition will call this function as a regular function and this keyword of regular function is undefined
        function () {
          //function to handle error
          alert('There is an Error');
        }
      );
    }
  }
  _loadMap(position) {
    //successful function
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coord = [latitude, longitude];

    //leaflet code to display map
    this.#map = L.map('map').setView(coord, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //leaflet function same as addEventListner
    //handling click events on map and show map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutOnMap(work); //  call this method here as the map is loaded
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus(); //to bring focus to the selected element
  }

  _hideForm() {
    //empty input fields
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    //hide form
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  displayErrorMsg(value, element) {
    console.log(value);
    if (element === inputElevation && !Number.isFinite(value)) {
      element.setCustomValidity('Invalid Input!');
      console.log('error1');
    } else if (!(Number.isFinite(value) && value > 0)) {
      element.setCustomValidity('Invalid Input!');
      console.log('error2');
    } else {
      element.setCustomValidity('');
    }
  }

  _newWorkOut(event) {
    event.preventDefault();

    //function for checking of data to be of number type
    const validData = (...inputs) => inputs.every(inp => Number.isFinite(inp)); // will return true or false based on the condition

    //function for checking data to be positive
    const positiveData = (...inputs) => inputs.every(inp => inp > 0);

    //get data from form
    const typeData = inputType.value;
    const distanceData = +inputDistance.value; //converted to a number
    const durationData = +inputDuration.value;

    /*inputDistance.addEventListener(
      'input',
      this.displayErrorMsg(inputDistance.value, inputDistance)
    );*/

    const { lat, lng } = this.#mapEvent.latlng; //destructuring
    let workout;

    //if workout is Running, create running onject
    if (typeData === 'running') {
      const cadenceData = +inputCadence.value;

      //check if data is valid
      if (
        !validData(distanceData, durationData, cadenceData) ||
        !positiveData(distanceData, durationData, cadenceData)
      ) {
        this.alertWindow();
        return;
      }

      workout = new Running(
        [lat, lng],
        distanceData,
        durationData,
        cadenceData
      );
    }

    //if workout is cycling, create cycling object
    if (typeData === 'cycling') {
      const elevationData = +inputElevation.value;

      //check if data is valid
      if (
        !validData(distanceData, durationData, elevationData) ||
        !positiveData(distanceData, durationData)
      ) {
        this.alertWindow();
        return;
      }

      workout = new Cycling(
        [lat, lng],
        distanceData,
        durationData,
        elevationData
      );
    }

    //add data to workouts array
    this.#workouts.push(workout);
    //console.log(workout);

    //render data on map
    //display marker on map
    //const { lat, lng } = this.#mapEvent.latlng; //destructuring
    this._renderWorkoutOnMap(workout);

    //render data on list
    this._rendorWorkoutOnList(workout);

    //Hide +clear input feilds
    this._hideForm();

    //set local storage to all workouts so as to store them
    this._setLocalStorage();
  }

  _renderWorkoutOnMap(work) {
    L.marker(work.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          //leaflet objects for popup
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${work.type}-popup`,
        })
      )
      .setPopupContent(
        `${work.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${work.description}` //seting description on markup
      )
      .openPopup();
  }

  _rendorWorkoutOnList(work) {
    let html = `<li class="workout workout--${work.type}" data-id=${work.id}>
    <h2 class="workout__title">${work.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        work.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      }</span>
      <span class="workout__value">${work.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${work.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;

    if (work.type === 'running') {
      html += `<div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${work.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${work.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
  </li>`;
    }

    if (work.type === 'cycling') {
      html += `<div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${work.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${work.elevationGain}</span>
      <span class="workout__unit">m</span>
    </div>
  </li>`;
    }

    form.insertAdjacentHTML('afterend', html); //inserting this string as the after sibling of form
  }

  _moveToClickedLocation(event) {
    if (!this.#map) return;
    const clickedEl = event.target.closest('.workout');

    if (!clickedEl) return;

    const workoutId = this.#workouts.find(
      work => work.id === clickedEl.dataset.id
    );

    this.#map.setView(workoutId.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    //for storing data in local storage
    localStorage.setItem('workoutsData', JSON.stringify(this.#workouts));
  }

  _addDataFromLS() {
    const localData = JSON.parse(localStorage.getItem('workoutsData'));

    //if data doesn't exist then simple return
    if (!localData) return;

    this.#workouts = localData; //since the page reloads the workouts array will be empty

    this.#workouts.forEach(work => {
      this._rendorWorkoutOnList(work); //adding workout on list again
      //this._renderWorkoutOnMap(work); // can't call this method here as the map is not yet loaded, it takes some time and we are calling _addDataFromLs from constructor i.e before the map loads
    });
  }

  //to delete the data from local storage
  resetData() {
    localStorage.removeItem('workoutsData');
    location.reload(); //reload the page after deleting data
  }

  openModal() {
    //event.preventDefault();
    modal.classList.remove('hidden');
    overlay.classList.remove('hidden');
  }

  //pop up window functions
  popupWindow() {
    /*const openModal = function (event) {
      //event.preventDefault();
      modal.classList.remove('hidden');
      overlay.classList.remove('hidden');
    };*/

    const closeModal = function () {
      modal.classList.add('hidden');
      overlay.classList.add('hidden');
    };

    btnCloseModal.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        closeModal();
      }
    });
  }

  //pop up the modal window for deleting the data
  deleteWindow() {
    this.popupWindow();
    //call the openModal after some time of page reloading
    setTimeout(this.openModal, 10000);
  }
  alertWindow() {
    modalHeader.textContent = 'Data must be a valid Positive Number!';
    modalBtn.classList.add('hidden');
    modal.style.border = 'solid red';
    //modal.maxHeight = '40px';
    this.openModal();
    this.popupWindow();
  }
}

const app = new App();

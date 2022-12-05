/* global Handlebars, utils, dataSource */ // eslint-disable-line no-unused-vars

{
  'use strict';

  const select = {
    templateOf: {
      menuProduct: '#template-menu-product',
    },
    containerOf: {
      menu: '#product-list',
      cart: '#cart',
    },
    all: {
      menuProducts: '#product-list > .product',
      menuProductsActive: '#product-list > .product.active',
      formInputs: 'input, select',
    },
    menuProduct: {
      clickable: '.product__header',
      form: '.product__order',
      priceElem: '.product__total-price .price',
      imageWrapper: '.product__images',
      amountWidget: '.widget-amount',
      cartButton: '[href="#add-to-cart"]',
    },
    widgets: {
      amount: {
        input: 'input[name="amount"]',
        linkDecrease: 'a[href="#less"]',
        linkIncrease: 'a[href="#more"]',
      },
    },
  };

  const classNames = {
    menuProduct: {
      wrapperActive: 'active',
      imageVisible: 'active',
    },
  };

  const settings = {
    amountWidget: {
      defaultValue: 1,
      defaultMin: 1,
      defaultMax: 9,
    }
  };

  const templates = {
    menuProduct: Handlebars.compile(document.querySelector(select.templateOf.menuProduct).innerHTML),
  };

  class Product{
    constructor(id, data){
      const thisProduct = this;
      this.id = id;
      this.data = data;
      thisProduct.renderInMenu();
      thisProduct.getElements();
      thisProduct.initAccordion();
      thisProduct.initOrderForm();
      thisProduct.initAmountWidget();
      thisProduct.processOrder();
    }
      
    renderInMenu(){
      const thisProduct = this;

      /* generate HTML based od template */

      const generatedHTML = templates.menuProduct(thisProduct.data);

      /* create element using utils.createElementFromHTML */

      thisProduct.element = utils.createDOMFromHTML(generatedHTML);

      /*find menu container */

      const menuContainer = document.querySelector(select.containerOf.menu);

      /* add element to menu */

      menuContainer.appendChild(thisProduct.element);

    }

    getElements(){
      const thisProduct = this;
    
      thisProduct.accordionTrigger = thisProduct.element.querySelector(select.menuProduct.clickable);
      thisProduct.form = thisProduct.element.querySelector(select.menuProduct.form);
      thisProduct.formInputs = thisProduct.form.querySelectorAll(select.all.formInputs);
      thisProduct.cartButton = thisProduct.element.querySelector(select.menuProduct.cartButton);
      thisProduct.priceElem = thisProduct.element.querySelector(select.menuProduct.priceElem);
      thisProduct.imageWrapper = thisProduct.element.querySelector(select.menuProduct.imageWrapper);
      thisProduct.amountWidgetElem = thisProduct.element.querySelector(select.menuProduct.amountWidget);
    }

    initAccordion(){

      const thisProduct = this;

      /* find the clickable trigger (the element that should react to clicking) */
      /*const clickableTrigger = thisProduct.element.querySelector(select.menuProduct.clickable);*/

      /* START: add event listener to clickable trigger on event click */
    
      thisProduct.accordionTrigger.addEventListener('click', function(event) {

        /* prevent default action for event */

        event.preventDefault();

        /* find active product (product that has active class) */

        const activeProduct = document.querySelector(select.all.menuProductsActive);
        console.log('Active Product is: ', activeProduct);

        /* if there is active product and it's not thisProduct.element, remove class active from it */

        if(activeProduct != null && activeProduct != thisProduct.element) {
          activeProduct.classList.remove('active');
        }

        /* toggle active class on thisProduct.element */

        thisProduct.element.classList.toggle('active');

      });
    }

    initOrderForm(){
      const thisProduct = this;

      thisProduct.form.addEventListener('submit', function(event){
        event.preventDefault();
        thisProduct.processOrder();
      });
      
      for(let input of thisProduct.formInputs){
        input.addEventListener('change', function(){
          thisProduct.processOrder();
        });
      }
      
      thisProduct.cartButton.addEventListener('click', function(event){
        event.preventDefault();
        thisProduct.processOrder();
      });
    }

    initAmountWidget(){
      const thisProduct = this;

      thisProduct.amountWidget = new AmountWidget(thisProduct.amountWidgetElem);
      thisProduct.amountWidgetElem.addEventListener('updated', function(){
        thisProduct.processOrder();
      });
    }

    processOrder(){
      const thisProduct = this;

      // convert form to object structure e.g. {sauce: ['tomato'], toppings: 
      const formData = utils.serializeFormToObject(thisProduct.form);

      // set price to default price
      let price = thisProduct.data.price;

      // for every category (param)...
      for(let paramId in thisProduct.data.params) {
        // determine param value, e.g. paramID - 'toppings', param = {label
        const param = thisProduct.data.params[paramId];

        // for every option in this category 
        for(let optionId in param.options) {
          // determine option value, e.g. optionId = 'olives', option = {label: 'Olives', price: 2, default: true}
          const option = param.options[optionId];
          // create optionImage by finding the params and options
          const optionImage = thisProduct.imageWrapper.querySelector('.' + paramId + '-' + optionId);
          // check if there's an option Image
          if(optionImage) {
            // if the option is checked, add it
            if(formData[paramId] && formData[paramId].includes(optionId)) {
              optionImage.classList.add(classNames.menuProduct.imageVisible);
              // if the option is not checked, remove it
            } else {
              optionImage.classList.remove(classNames.menuProduct.imageVisible);
            }
          }
          // check if there is param with a name of paramId in formData
          if(formData[paramId] && formData[paramId].includes(optionId)) {
          // check if the option is not default
            if(!option.default == true) {
              // add option price to price variable
              price = price + option['price'];            
            }
          } else {
            // check if the option is default
            if(option.default == true) {
              // reduce price variable
              price = price - option['price'];
            }
          }
        }
      }
      price *= thisProduct.amountWidget.value;
      // update calculated price in the HTML
      thisProduct.priceElem.innerHTML = price;
    }
  }

  class AmountWidget {
    constructor(element){
      const thisWidget = this;

      thisWidget.getElements(element);
      thisWidget.setValue(settings.amountWidget.defaultValue);
      thisWidget.initActions();
    }

    getElements(element){
      const thisWidget = this;

      thisWidget.element = element;
      thisWidget.input = thisWidget.element.querySelector(select.widgets.amount.input);
      thisWidget.linkDecrease = thisWidget.element.querySelector(select.widgets.amount.linkDecrease);
      thisWidget.linkIncrease = thisWidget.element.querySelector(select.widgets.amount.linkIncrease);
    }

    setValue(value){
      const thisWidget = this;

      const newValue = parseInt(value);
      const maxValue = settings.amountWidget.defaultMax;
      const minValue = settings.amountWidget.defaultMin;

      if(thisWidget.value !== newValue && !isNaN(newValue) && maxValue + 1 <= newValue && minValue - 1 >= newValue) {
        thisWidget.value = newValue;
      }

      thisWidget.value = newValue;
      thisWidget.input.value = thisWidget.value;
      thisWidget.announce();
    } 

    announce(){
      const thisWidget = this;

      const event = new Event('updated');
      thisWidget.element.dispatchEvent(event);
    }

    initActions(){
      const thisWidget = this;
      thisWidget.input.addEventListener('change', function(){
        thisWidget.setValue(thisWidget.input.value);
      });
      thisWidget.linkDecrease.addEventListener('click', function(event){
        event.preventDefault();
        thisWidget.setValue(--thisWidget.value);
      });
      thisWidget.linkIncrease.addEventListener('click', function(event){
        event.preventDefault();
        thisWidget.setValue(++thisWidget.value);
      });
    }
  }

  const app = {
    initMenu: function(){
      const thisApp = this;

      console.log('this app data: ', thisApp.data);
      for(let productData in thisApp.data.products){
        new Product(productData, thisApp.data.products[productData]);
      }
    },

    initData: function() {
      const thisApp= this;
      
      thisApp.data = dataSource;
    },

    init: function(){
      const thisApp = this;
      console.log('*** App starting ***');
      console.log('thisApp:', thisApp);
      console.log('classNames:', classNames);
      console.log('settings:', settings);
      console.log('templates:', templates);

      thisApp.initData();
      thisApp.initMenu();
    },
  };

  app.init();
}


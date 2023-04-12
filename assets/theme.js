/*================ Vendor ================*/

/*! js-cookie v2.2.1 | MIT */

!function(a){var b;if("function"==typeof define&&define.amd&&(define(a),b=!0),"object"==typeof exports&&(module.exports=a(),b=!0),!b){var c=window.Cookies,d=window.Cookies=a();d.noConflict=function(){return window.Cookies=c,d}}}(function(){function a(){for(var a=0,b={};a<arguments.length;a++){var c=arguments[a];for(var d in c)b[d]=c[d]}return b}function b(a){return a.replace(/(%[0-9A-Z]{2})+/g,decodeURIComponent)}function c(d){function e(){}function f(b,c,f){if("undefined"!=typeof document){f=a({path:"/"},e.defaults,f),"number"==typeof f.expires&&(f.expires=new Date(1*new Date+864e5*f.expires)),f.expires=f.expires?f.expires.toUTCString():"";try{var g=JSON.stringify(c);/^[\{\[]/.test(g)&&(c=g)}catch(j){}c=d.write?d.write(c,b):encodeURIComponent(c+"").replace(/%(23|24|26|2B|3A|3C|3E|3D|2F|3F|40|5B|5D|5E|60|7B|7D|7C)/g,decodeURIComponent),b=encodeURIComponent(b+"").replace(/%(23|24|26|2B|5E|60|7C)/g,decodeURIComponent).replace(/[\(\)]/g,escape);var h="";for(var i in f)f[i]&&(h+="; "+i,!0!==f[i]&&(h+="="+f[i].split(";")[0]));return document.cookie=b+"="+c+h}}function g(a,c){if("undefined"!=typeof document){for(var e={},f=document.cookie?document.cookie.split("; "):[],g=0;g<f.length;g++){var h=f[g].split("="),i=h.slice(1).join("=");c||'"'!==i.charAt(0)||(i=i.slice(1,-1));try{var j=b(h[0]);if(i=(d.read||d)(i,j)||b(i),c)try{i=JSON.parse(i)}catch(k){}if(e[j]=i,a===j)break}catch(k){}}return a?e[a]:e}}return e.set=f,e.get=function(a){return g(a,!1)},e.getJSON=function(a){return g(a,!0)},e.remove=function(b,c){f(b,"",a(c,{expires:-1}))},e.defaults={},e.withConverter=c,e}return c(function(){})});

/*================ Features ================*/
jquery_default(function ($) {
    var $cart = $('.cart-page');

    if($cart.length){
        var $notes = $cart.find("[name='note']");

        //Sync both note fields
        $notes.on("change", function(){
            var value = $(this).val();

            $notes.val(value);

            console.log("sync notes: " + value);
        });
    }

    $(".template-product .product-options, .template-product .product-quantity ").wrapAll('<div class="product-options__wrapper" />');
});

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function fetchConfig(type = 'json') {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': `application/${type}` }
  };
}

class MiniCartRemoveButton extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', (event) => {
      event.preventDefault();
      this.closest('mini-cart').updateQuantity(this.dataset.index, 0);
    });
  }
}

customElements.define('mini-cart-remove-button', MiniCartRemoveButton);

class MiniCart extends HTMLElement {
  constructor() {
    super();

    this.miniCart = this.querySelector('[data-mini-cart]');
    this.miniCartTrigger = document.querySelector('[data-mini-cart-trigger]');
    this.overlay = document.querySelector('[data-mini-cart-overlay]');
    this.onBodyClick = this.onBodyClick.bind(this);
    this.headerToolsCart = document.querySelector('.header-tools-cart');

    this.debouncedOnChange = debounce((evt) => {
      this.onChange(evt);
    }, 300);

    this.addEventListener('change', this.debouncedOnChange.bind(this));
  
    this.miniCartTrigger.addEventListener('click', this.onTriggerClick.bind(this));
    this.miniCart.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    this.querySelector('[data-mini-cart-close]').addEventListener('click', this.close.bind(this));
  }

  open() {
    document.documentElement.classList.add('mini-cart-visible', 'scroll-locked');

    document.body.addEventListener('click', this.onBodyClick);
  }

  close() {
    document.documentElement.classList.remove('mini-cart-visible', 'scroll-locked');

    document.body.removeEventListener('click', this.onBodyClick);
  }

  renderContents(parsedState) {
    this.productId = parsedState.id;
    this.getSectionsToRender().forEach((section => {
      document.getElementById(section.id).innerHTML =
        this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
    }));

    this.open();
  }

  getSectionsToRender() {
    return [
      {
        id: 'mini-cart-items',
        section: document.getElementById('mini-cart-items').dataset.id,
        selector: '.js-contents'
      },
      {
        id: 'mini-cart-footer',
        section: document.getElementById('mini-cart-footer').dataset.id,
        selector: '.js-contents'
      }
    ];
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    return new DOMParser()
      .parseFromString(html, 'text/html')
      .querySelector(selector).innerHTML;
  }

  onTriggerClick(evt) {
    evt.preventDefault();

    if(document.documentElement.classList.contains('mini-cart-visible')) {
      this.close();
    } else {
      this.open();
    }
  }

  onBodyClick(evt) {
    if(!this.contains(evt.target) && !evt.target.closest('[data-mini-cart-trigger]')) {
      this.close();
    }
  }

  onChange(evt) {
    this.updateQuantity(evt.target.dataset.index, evt.target.value, document.activeElement.getAttribute('name'));
  }

  updateQuantity(line, quantity, name) {
    const body = JSON.stringify({
      line,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.id),
      sections_url: window.location.pathname
    });

    fetch(`${Theme.routes.cart_change_url}`, {...fetchConfig(), ...{ body }})
      .then((response) => response.json())
      .then((response) => {
        if (response.status) {
          // response.description;
          return;
        }

        this.renderContents(response);

        // Remove cart notification dot
        if(response.item_count == 0) {
          this.headerToolsCart.classList.remove('cart-has-content');
        }
      }).catch((e) => {
        console.error(e);
      });
  }
}

customElements.define('mini-cart', MiniCart);

class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input');
    this.changeEvent = new Event('change', { bubbles: true })

    this.querySelectorAll('button').forEach(
      (button) => button.addEventListener('click', this.onButtonClick.bind(this))
    );
  }

  onButtonClick(evt) {
    evt.preventDefault();
    const previousValue = this.input.value;

    evt.target.name === 'plus' ? this.input.stepUp() : this.input.stepDown();
    if (previousValue !== this.input.value) this.input.dispatchEvent(this.changeEvent);
  }
}

customElements.define('quantity-input', QuantityInput);

const showAllButton = document.querySelector('.show-all');

if (showAllButton !== null) {
    const showCollections = document.querySelectorAll('.show-name');

    showAllButton.addEventListener('click', () => {
        showCollections.forEach((collection) => {
            collection.classList.add('show');
        })
        showAllButton.classList.remove('show-all');
    });
};


//slider
let sliderIndex = 1;
showSlides(sliderIndex);

function sliderNav(n) {
  showSlides(sliderIndex += n);
}

function currentSlide(n) {
  showSlides(sliderIndex = n);
}

function showSlides(n) {
    let i;
    let slides = document.getElementsByClassName("mobile-slider");

    if(slides.length) {
        if (n > slides.length) {sliderIndex = 1}    
        if (n < 1) {sliderIndex = slides.length}
        for (i = 0; i < slides.length; i++) {
            slides[i].classList.add('hide'); 
        }

        slides[sliderIndex-1].classList.remove('hide');
    }
}

jquery_default(function ($) {
    var $popup = $('.newsletter-popup');

	if($popup.length) {
        var $close = $popup.find('.notification__close');
        var $success = location.search.includes('customer_posted=true');

		// Show newsletter popup after 7s if it hasn't been shown yet
		if(!Cookies.get('newsletter-shown')) {
			setTimeout(function() {
                $popup.addClass('open');
                //Expires in 30 days
                Cookies.set('newsletter-shown', true, { expires: 30 });
			}, 7000);
		}

        //Form has been submitted
        if($success){
            $popup.addClass('open');

            setTimeout(function(){
                $popup.removeClass('open');
            }, 7000);
        }

		$close.on('click', function(e) {
			e.preventDefault();
			$popup.removeClass('open');
		});
	}
});
const ARTICLE_CONTENT_SELECTOR = "article#main";
const FOOTNOTE_SECTION_SELECTOR = "div.footnotes[role=doc-endnotes]";
// this is a prefix-match on ID.
const INDIVIDUAL_FOOTNOTE_SELECTOR = "li[id^='fn:']";
const FLOATING_FOOTNOTE_MIN_WIDTH = 1260;
const SIDENOTE_MARGIN_WIDTH_FACTOR = 1.15;


function docReady(fn) {
    // see if DOM is already available
    if (document.readyState === "complete" || document.readyState === "interactive") {
        // call on next available tick
        setTimeout(fn, 1);
    } else {
        document.addEventListener("DOMContentLoaded", fn);
    }
}

function windowLoaded(fn) {
    // see if we're already loaded
    if (document.readyState === "complete") {
        // call on next available tick
        setTimeout(fn, 1);
    } else {
        window.addEventListener("load", fn);
    }
}

function onWindowResize(fn) {
    windowLoaded(function () {
        window.addEventListener('resize', fn);
        setTimeout(fn, 1);
    });
}


// Computes an offset such that setting `top` on elemToAlign will put it
// in vertical alignment with targetAlignment.
function computeOffsetForAlignment(elemToAlign, targetAlignment) {
    const offsetParentTop = elemToAlign.offsetParent.getBoundingClientRect().top;
    // Distance between the top of the offset parent and the top of the target alignment
    return targetAlignment.getBoundingClientRect().top - offsetParentTop;
}

function setFootnoteOffsets(footnotes) {
    // Keep track of the bottom of the last element, because we don't want to
    // overlap footnotes.
    let bottomOfLastElem = 0;
    Array.prototype.forEach.call(footnotes, function (footnote, i) {

        // In theory, don't need to escape this because IDs can't contain
        // quotes, in practice, not sure. ¯\_(ツ)_/¯

        // Get the thing that refers to the footnote
        const intextLink = document.querySelector("a.footnote-ref[href='#" + footnote.id + "']");
        // Find its "content parent"; nearest paragraph or list item or
        // whatever. We use this for alignment because it looks much cleaner.
        // If it doesn't, your paragraphs are too long :P
        // Fallback - use the same height as the link.
        const verticalAlignmentTarget = intextLink.closest('p,li') || intextLink;

        let offset = computeOffsetForAlignment(footnote, verticalAlignmentTarget);
        if (offset < bottomOfLastElem) {
            offset = bottomOfLastElem;
        }
        // computedStyle values are always in pixels, but have the suffix 'px'.
        // offsetHeight doesn't include margins, but we want it to use them so
        // we retain the style / visual fidelity when all the footnotes are
        // crammed together.
        bottomOfLastElem =
            offset +
            footnote.offsetHeight +
            parseInt(window.getComputedStyle(footnote).marginBottom) +
            parseInt(window.getComputedStyle(footnote).marginTop);

        footnote.style.top = offset + 'px';
        footnote.style.position = 'absolute';
    });
}

function clearFootnoteOffsets(footnotes) {
    // Reset all
    Array.prototype.forEach.call(footnotes, function (fn, i) {
        fn.style.top = null;
        fn.style.position = null;
    });
}

function isMarginWideEnough(footnoteSection) {
    
    
    const contentSection = footnoteSection.parentElement;
    //content section includes width of footnote so it must be subtracted
    const sidenoteWidth = footnoteSection.scrollWidth;
    const contentWidth = contentSection.scrollWidth - sidenoteWidth;


    console.log("Parent width: ", contentSection.scrollWidth);
    console.log("Window width: ", window.innerWidth);
    //assumes content is centered in middle of window
    availableMargin = (window.innerWidth - contentWidth)/2;
    console.log("Margin: ", availableMargin);

    console.log("Sidenote width: ", sidenoteWidth);

    return availableMargin >= sidenoteWidth*SIDENOTE_MARGIN_WIDTH_FACTOR;
}


// contract: this is idempotent; i.e. it won't wreck anything if you call it
// with the same value over and over again. Though maybe it'll wreck performance
// lol.
function updateFootnoteFloat(isFloating) {
    const footnoteSection = document.querySelector(FOOTNOTE_SECTION_SELECTOR);
    const footnotes = footnoteSection.querySelectorAll(INDIVIDUAL_FOOTNOTE_SELECTOR);
    
    // Do this first because we need styles applied before doing other
    // calculations
    footnoteSection.classList.add('floating-footnotes');
    let shouldFloat = isMarginWideEnough(footnoteSection);
    
    if (shouldFloat) {
        setFootnoteOffsets(footnotes);
        subscribeToUpdates();
    } else {
        unsubscribeFromUpdates();
        clearFootnoteOffsets(footnotes);
        footnoteSection.classList.remove('floating-footnotes');
    }
}

function subscribeToUpdates() {
    const article = document.querySelector(ARTICLE_CONTENT_SELECTOR);
    // Watch for dimension changes on the thing that holds all the footnotes so
    // we can reposition as required
    resizeObserver.observe(article);
}

function unsubscribeFromUpdates() {
    resizeObserver.disconnect();
}


const notifySizeChange = function() {
    // Default state, not expanded.
    let isFloating = false;

    return function () {
        // Pixel width at which this looks good
        updateFootnoteFloat();
    };
}();

const resizeObserver = new ResizeObserver((_entries, observer) => {
    // By virtue of the fact that we're subscribed, we know this is true.
    updateFootnoteFloat(true);
});

function isMobile() {
    return (
        (("ontouchstart" in document.documentElement) && matchMedia("max-width: 649px")) 
        || !matchMedia("only screen and (hover: hover) and (pointer: fine)")
    );
}

function enableFloatingFootnotes() {
    console.log("Firing enableFloatingFootnotes().")
    docReady(() => {
        const footnoteSection = document.querySelector(FOOTNOTE_SECTION_SELECTOR);
        const article = document.querySelector(ARTICLE_CONTENT_SELECTOR);
        

        // only set it all up if there's actually a footnote section and
        // we're not on mobile.
        
        if (footnoteSection && !isMobile()) {
            console.log("Sidenotes enabled.");
            onWindowResize(notifySizeChange);
        }
    });
}

enableFloatingFootnotes();

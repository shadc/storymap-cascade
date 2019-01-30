require(['dojo/topic'], function (topic) {
  /*
   * Custom Javascript to be executed while the application is initializing goes here
   */

  // The application is ready
  topic.subscribe('tpl-ready', function () {
    /*
     * Custom Javascript to be executed when the application is ready goes here
     */
    function scrollToAnchor() {
      let section = $(".section-layout-title:eq(" + currentSection + ")");
      $('html,body').animate({ scrollTop: section.offset().top - 50 }, 'slow');
    }

    let currentSection = -1, maxSections = $(".section-layout-title").length - 1;

    $(document).keydown(function (e) {
      if ((e.keyCode == 37 || e.keyCode == 38)) {  //Left or up 
        if (currentSection > 0) currentSection--;
        scrollToAnchor();
      }
      if (e.keyCode == 39 || e.keyCode == 40) {  //right or down 
        if (currentSection < maxSections) currentSection++;
        scrollToAnchor();
      }
    });

    //console.log('Cascade is ready');
  });

  /*
   * Custom Javascript to be executed when a section becomes active
   */
  topic.subscribe('story-navigated-section', function (/*cfg*/) {
    //console.log('The section', cfg.index, 'is now active');
  });

});

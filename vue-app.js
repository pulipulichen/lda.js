/* global XLSX, lda, appData, appComputed, appWatch, appMethods, appMounted */

let postMessageAPI = PuliPostMessageAPI({
  manuallyReady: true
})

var app = {
  el: '#app',
  data: appData,
  computed: appComputed,
  mounted: appMounted,
  watch: appWatch,
  methods: appMethods
}

app = new Vue(app)
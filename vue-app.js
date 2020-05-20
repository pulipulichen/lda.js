/* global XLSX, lda */

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
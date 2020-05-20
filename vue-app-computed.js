var appComputed = {
    searchParams () {
      let output = {}
      const currentURL = new URL(location.href)
      for(let [key, value] of currentURL.searchParams.entries()) {
        output[key] = value
      }
      return output
    },
    sortedTopicDocuments () {
      
      setTimeout(() => {
        let table = $(this.$refs.DocumentTable)
        table.find('.sentence').popup()
        table.tablesort({
          sortInitialOrder: 'desc',
          afterSort: () => {
            table.find('.sentence').popup()
          }
        })
      }, 0)
      if (this.sortDocuments === -1) {
        //console.log(this.topicDocuments[0])
        return this.topicDocuments
      }
      else {
        let output = JSON.parse(JSON.stringify(this.topicDocuments))
        output.sort(function (a, b) {
          return (b.theta[this.sortDocuments] - a.theta[this.sortDocuments])
        })
      }
    },
    topicNumberArray () {
      let output = []
      for (let i = 0; i < this.topicTerms.length; i++) {
        output.push(i)
      }
      return output
    }
  }
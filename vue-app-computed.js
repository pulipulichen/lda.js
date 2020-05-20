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
      
      if (this.documentSortField === null) {
        return this.topicDocuments
      }
      
      let sortDocuments = Array.from(Object.create(this.topicDocuments));
      //console.log(this.documentSortField)
      if (this.documentSortField === 'id') {
        sortDocuments.sort((a, b) => {
          if (this.documentSortOrder === 'asc') {
            return (a.id - b.id)
          }
          else {
            return (b.id - a.id)
          }
        })
      }
      else if (this.documentSortField === 'topics') {
        sortDocuments.sort((a, b) => {
          if (this.documentSortOrder === 'asc') {
            return (a.topic - b.topic)
          }
          else {
            return (b.topic - a.topic)
          }
        })
      }
      else if (this.documentSortField === 'alphabetical') {
        sortDocuments.sort((a, b) => {
          let sort = -1
          if (this.documentSortOrder === 'asc') {
            if (a.sentence > b.sentence) {
              sort = 1
            }
            else {
              sort = -1
            }
          }
          else {
            if (a.sentence > b.sentence) {
              sort = -1
            }
            else {
              sort = 1
            }
          }
          return sort
        })
      }
      else if (typeof(this.documentSortField) === 'number') {
        let i = this.documentSortField
        //console.log(i)
        sortDocuments.sort((a, b) => {
          if (this.documentSortOrder === 'asc') {
            return (a.theta[i] - b.theta[i])
          }
          else {
            return (b.theta[i] - a.theta[i])
          }
        })
      }
      //console.log(this.documentSortField)
      
      return sortDocuments
    },
    sortedTopicTerms () {
      return []
    },
    topicNumberArray () {
      let output = []
      for (let i = 0; i < this.topicTerms.length; i++) {
        output.push(i)
      }
      return output
    }
  }
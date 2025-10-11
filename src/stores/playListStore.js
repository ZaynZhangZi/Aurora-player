import {ref, computed} from 'vue'
import {defineStore} from 'pinia'

export const playListsStore = defineStore('playLists', {
    state: () => ({
        singPlayListId: null,
    }),
    getters: {
        getsingPlayListId: state => state.singPlayListId
    },
    actions: {
        setsingPlayListId(id) {
            this.singPlayListId = id
        }
    },
    persist: true // 将 persist 放在这里
})

import { defineStore } from 'pinia'

export const CardItemControl = defineStore('CardItemControl', {
    state: () => ({
        isshow: false
    }),
    getters: {
        getisshow: state => state.isshow
    },
    actions: {
        setisshow(value) {
            this.isshow = value
        }
    }
})

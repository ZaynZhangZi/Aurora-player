import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useCounterStore = defineStore('userinfo', {
    state: () => ({
        userCookie: '',
        userMassage: ''
    }),
    getters: {
        getUserCookie: state => state.userCookie,
        getUserMassage: state => state.userMassage
    },
    actions: {
        setUserCookie(cookie) {
            this.userCookie = cookie
        },
        setUserMassage(massage) {
            this.userMassage = massage
        },
    },
    persist: {
        storage: localStorage,
        key: 'userinfo-store',
    }
})

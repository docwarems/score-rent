const app = Vue.createApp({
    data() {
        return {
            email: 'Mario@vue.com',
            password: 'geheim',
            role: '',
        }
    },
    methods: {
        handleSubmit() {
            console.log(`form submitted: email=${this.email}. password=${this.password}`);
        }
    }
})

app.mount('#app')


const app1 = Vue.createApp({
    data() {
        return {
            showBooks: true,
            title: 'The final empire',
            author: 'Brandon Sanderson',
            age: <%= age %>,
        }
    },
    methods: {
        toggleShowBooks() {
            this.showBooks = !this.showBooks
        }
    }
})

app1.mount('#app1')
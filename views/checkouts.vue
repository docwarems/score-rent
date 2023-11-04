const app = Vue.createApp({
    data() {
        return {
            admin: <%= admin %>,
            signature: "",
            checkedOut: true,
        }
    },
    methods: {
        handleCheckoutsSubmit() {
            console.log(`signature=${this.signature}, checkedOut=${this.checkedOut}`);
        }
    }
})

app.mount('#app')
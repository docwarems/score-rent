const app = Vue.createApp({
    data() {
        return {
            admin: <%= admin %>,
            signature: "",
            signatures: JSON.parse('<%- signatures %>'),
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
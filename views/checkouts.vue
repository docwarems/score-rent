const app = Vue.createApp({
    data() {
        return {
            admin: <%= admin %>,
            signature: "",
            signatures: JSON.parse('<%- signatures %>'),
            filter: JSON.parse('<%- filter %>'),
            checkouts: undefined,
            checkedOut: true,
            scoreTypeTotalCount: 0,
            scoreTypeTotalCheckedOutCount: 0,
            statSummary: '',
            hasError: false,
            error: undefined,
            SIGNATURE_ALL: { id: 'ALL', name: 'Alle'},
            userNamePlusVoice: '',
            showUserDetails: false,
        }
    },
    methods: {
        handleCheckoutsSubmit() {
            console.log(`signature=${this.signature}, checkedOut=${this.checkedOut}`);
        },
        userDetails() {
            // v-show does not work here - don't know why
            const userDetailsModal = this.$refs["userDetailsModal"];
            userDetailsModal.style = 'display: block';
        },
        closeUserDetails() {
            const userDetailsModal = this.$refs["userDetailsModal"];
            userDetailsModal.style = 'display: none';
        },
        async postCheckouts() {
            try {
                const res = await fetch('/score/checkouts-vue', {
                    method: 'POST',
                    body: JSON.stringify({
                        signature: this.signature,
                        checkedOut: this.checkedOut,
                        userId: undefined,
                    }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                const data = await res.json();
                // console.log("data=", data);
                this.admin = data.admin;
                this.checkouts = data.checkouts;
            } catch (err) {
                console.log("err=", err);
            }
        }
    },
})

app.mount('#app')
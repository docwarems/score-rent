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
            userDetailsName: '',
            userDetailsEmail: '',
            userDetailsRegisterDate: 'TODO',
            editCheckoutId: '',
            editCheckoutScoreId: '',
            editCheckoutComment: '',
            editCheckinComment: '',
            editCheckoutUserId: '',
            showEditCheckoutModalSuccess: false,
            showEditCheckoutModalError: false,
            showFoo: false,
            editCheckoutModalError: '',
        }
    },
    methods: {
        handleCheckoutsSubmit() {
            console.log(`signature=${this.signature}, checkedOut=${this.checkedOut}`);
        },
        userDetails(user) {
            this.userDetailsName = user.name;
            this.userDetailsEmail = user.email;
            // v-show does not work here - don't know why
            const userDetailsModal = this.$refs["userDetailsModal"];
            userDetailsModal.style = 'display: block';
        },
        closeUserDetails() {
            const userDetailsModal = this.$refs["userDetailsModal"];
            userDetailsModal.style = 'display: none';
        },
        editCheckout(checkout) {
            this.showEditCheckoutModalSuccess = false;
            this.showEditCheckoutModalError = false;
            this.editCheckoutId = checkout.id;
            this.editCheckoutScoreId = checkout.scoreId;
            this.editCheckoutComment = checkout.checkoutComment;
            this.editCheckinComment = checkout.checkinComment;
            this.editCheckoutUserId = checkout.user.id;
            // v-show does not work here - don't know why
            const editCheckoutModal = this.$refs["editCheckoutModal"];
            editCheckoutModal.style = 'display: block';
        },
        async updateCheckout() {
            console.log("editCheckoutComment", this.editCheckoutComment, "editCheckinComment=", this.editCheckinComment, "editCheckoutUserId=", this.editCheckoutUserId);

            const res = await fetch('/score/updateCheckout', {
                method: 'POST',
                body: JSON.stringify({
                    scoreId: this.editCheckoutScoreId,
                    checkoutId: this.editCheckoutId,
                    checkoutComment: this.editCheckoutComment,
                    checkinComment: this.editCheckinComment,
                    userId: this.editCheckoutUserId,
                }),
                    headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = await res.json();
            console.log("data=", data);

            if (data.errors) {
                this.showEditCheckoutModalError = true;
                this.editCheckoutModalError = data.errors;
            }
            if (data.updateScore) {
                this.showEditCheckoutModalSuccess = true;
                // TODO: update filtered checkouts list
            }
        },
        closeEditCheckout() {
            const editCheckoutModal = this.$refs["editCheckoutModal"];
            editCheckoutModal.style = 'display: none';
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
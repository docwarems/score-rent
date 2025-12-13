const app = Vue.createApp({
    data() {
        return {
            filter: { active: <%= filter.active %> },
            users: JSON.parse('<%- JSON.stringify(users) %>'),
            error: '',
            searchLastName: '',
            showEditUserModal: false,
            editUserId: '',
            editUserEmail: '',
            editUserActive: false,
            editUserSuccess: false,
            editUserError: '',
        }
    },
    computed: {
        filteredUsers() {
            if (!this.searchLastName) return this.users;
            const search = this.searchLastName.toUpperCase();
            return this.users.filter(user => 
                user.lastName.toUpperCase().includes(search)
            );
        }
    },
    methods: {
        async handleFilterSubmit() {
            this.error = '';
            try {
                const res = await fetch('/admin/users', {
                    method: 'POST',
                    body: JSON.stringify({
                        active: this.filter.active,
                    }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                const data = await res.json();
                
                if (data.errors) {
                    this.error = data.errors;
                } else if (data.users) {
                    this.users = data.users;
                    this.searchLastName = '';
                }
            } catch (err) {
                this.error = err.message;
            }
        },
        editUser(user) {
            this.editUserId = user.id;
            this.editUserEmail = user.email;
            this.editUserActive = user.active;
            this.editUserSuccess = false;
            this.editUserError = '';
            this.showEditUserModal = true;
        },
        closeEditUser() {
            this.showEditUserModal = false;
        },
        async updateUser() {
            this.editUserError = '';
            this.editUserSuccess = false;
            
            try {
                const res = await fetch('/admin/updateUser', {
                    method: 'POST',
                    body: JSON.stringify({
                        id: this.editUserId,
                        email: this.editUserEmail,
                        active: this.editUserActive,
                    }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                const data = await res.json();
                
                if (data.errors) {
                    this.editUserError = data.errors;
                } else if (data.updateUser) {
                    this.editUserSuccess = true;
                    // Update user in list
                    const user = this.users.find(u => u.id === this.editUserId);
                    if (user) {
                        user.email = this.editUserEmail;
                        user.active = this.editUserActive;
                    }
                }
            } catch (err) {
                this.editUserError = err.message;
            }
        }
    }
});

app.mount('#app');
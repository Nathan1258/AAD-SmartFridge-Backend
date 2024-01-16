# Advanced Analysis and Design API

### Production endpoint
**[https://aad-api.ellisn.com](https://aad-api.ellisn.com)**
### Locally hosted endpoint
**[http://localhost:5021](http://localhost:5021)**

## Running the server locally

To run the server, make sure you have Node.js installed. Then, follow these steps:

1. Clone the code (you'll need to be logged in):
    ```bash
       git clone https://github.com/Nathan1258/aad-smartfridge-backend
    ```

2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the server:

    ```bash
   npm start
   ```
The server will now be available at `http://localhost:5021/`. Alternatively just use the production endpoint [here](https://aad-api.ellisn.com)


## Endpoints

### User Authentication

- **Endpoint:** `/v1/users/change-user-access`
  - **Method:** PUT
  - **Description:** Change a user's access
  - **Permissions:** Requires admin privileges.
  - **Paramters:**
    - *accessValue*:**integer**
    - *userIDToChange*:**string**

### Reports

- **Endpoint:** `/v1/reports/generate`
  - **Method:** GET
  - **Description:** Generate a report.
  - **Permissions:** Requires health and safety privileges.

## User Verification Functions

In the `verify.js` file, you'll find functions for verifying user permissions:

- **`verify`:** General verification without access permission checks.
- **`verifyAdmin`:** Verification for users with admin privileges.
- **`verifyHealth`:** Verification for users with health and safety privileges.

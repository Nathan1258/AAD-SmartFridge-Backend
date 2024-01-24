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

The server will now be available at `http://localhost:5021/`. Alternatively just use the production
endpoint [here](https://aad-api.ellisn.com)

## Endpoints

### User Authentication

- **Register a User:** `/v1/users/register`
    - **Method:** POST
    - **Description:** Register a new user. Default *access* is **Normal** unless specified.
    - **Parameters:**
        - *first_name*: **string**
        - *last_name*: **string**
        - (Optional) *access*: **string**
        - *password*: **string**


- **Clock in a user:** `/v1/users/clock-in`
    - **Method:** POST
    - **Description:** Clock a user in for the day. Returns a 4 digit PIN they can use to access the web app for that
      day's shift.
    - **Parameters:**
        - *uid*: **int**
        - *password*: **string**

- **Change a user's access:** `/v1/users/change-user-access`
    - **Method:** PUT
    - **Description:** Change a user's access
    - **Permissions:** Requires admin privileges.
    - **Parameters:**
        - *accessPIN*: **integer**
        - *uid*: **string**
        - *newAccessValue*: **integer**

### Reports

- **Generate a report:** `/v1/reports/generate`
    - **Method:** GET
    - **Description:** Generate a report.
    - **Permissions:** Requires health and safety privileges.

- **Log an action:** `/v1/reports/log-action`
    - **Method:** POST
    - **Description:** Logs an action to the activity log. If *uid* is not present then the current user performing the
      request will be used.
    - **Parameters:**
        - (Optional) *uid*: **int**
        - *action*: **string**

### Items

- **Retrieve all items supported by the system:** `/v1/items`
    - **Method:** POST
    - **Description:** Returns an array of all items in the system. If 'instock' query is present, then only items in
      stock will be returned.
    - **Parameters:**
        - *accessPIN*: **integer**
    - **Query Parameters**
        - (Optional) *instock*: **boolean**

- **Return a specific item:** `/v1/item/<item-name>`
    - **Method:** POST
    - **Description:** Returns a specific Item's data in the system.
    - **Parameters:**
        - *accessPIN*: **integer**

- **Insert an item in the Inventory:** `/v1/item/insert`
    - **Method:** POST
    - **Description:** Adds a specific item to the Fridge's inventory.
    - **Parameters:**
        - *accessPIN*: **integer**
        - *itemID*: **integer**
        - *quantity to remove*: **integer**
        - *expiryDate*: **string** (DD-MM-YY format **'24-12-24'**)

- **Remove an item in the Inventory:** `/v1/item/remove`
    - **Method:** POST
    - **Description:** Adds a specific item to the Fridge's inventory.
    - **Parameters:**
        - *accessPIN*: **integer**
        - *itemID*: **integer**
        - *quantity to remove*: **integer**

## User Verification Functions

In the `verify.js` file, you'll find functions for verifying user permissions:

- **`verify`:** General verification without access permission checks.
- **`verifyAdmin`:** Verification for users with admin privileges.
- **`verifyHealth`:** Verification for users with health and safety privileges.

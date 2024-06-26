# Advanced Analysis and Design API

The frontend for this application can be found [here](https://github.com/Nathan1258/AAD-SmartFridge-Frontend/tree/main)

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
    - **Method:** POST
    - **Description:** Change a user's access
    - **Permissions:** Requires admin privileges.
    - **Parameters:**
        - *accessPIN*: **integer**
        - *uid*: **string**
        - *newAccessValue*: **integer**

- **Get all users:** `/v1/users/getallusers`
    - **Method:** POST
    - **Description:** Returns all users in the database
    - **Permissions:** Requires admin privileges.
    - **Parameters:**
        - *accessPIN*: **integer**

### Reports

- **Log an action:** `/v1/reports/log-action`
    - **Method:** POST
    - **Description:** Logs an action to the activity log. If *uid* is not present then the current user performing the
      request will be used.
    - **Parameters:**
        - *accessPIN*: **integer**
        - (Optional) *uid*: **int**
        - *action*: **string**

- **Get activity Log:** `/v1/reports/fetch/logs`
    - **Method:** POST
    - **Description:** Returns activity log with given date range. If **dateStart** and **dateEnd** are not specified
      then
      all logs will be returned. Otherwise, if **dateStart** and **dateEnd** (both Unix timestamps) are present, then
      only logs that have occurred in that given time range will be returned.
    - **Parameters:**
        - *accessPIN*: **integer**
        - (Optional) *dateStart*: **integer**
        - (Optional) *dateStart*: **integer**

### Items

- **Retrieve all items supported by the system:** `/v1/items`
    - **Method:** POST
    - **Description:** Returns an array of all items in the system. If 'instock' query is present, then only items in
      stock will be returned.
    - **Parameters:**
        - *accessPIN*: **integer**
    - **Query Parameters**
        - (Optional) *instock*: **boolean**

- **Retrieve all items that are expiring soon:** `/v1/items/expiring`
    - **Method:** POST
    - **Description:** Returns an array of all items that are expiring within 3 days from current date.
    - **Parameters:**
        - *accessPIN*: **integer**

- **Return a specific item:** `/v1/items/fetch/<item-name>`
    - **Method:** POST
    - **Description:** Returns a specific Item's data in the system.
    - **Parameters:**
        - *accessPIN*: **integer**

- **Insert an item in the Inventory:** `/v1/items/insert`
    - **Method:** POST
    - **Description:** Adds a specific item to the Fridge's inventory.
    - **Parameters:**
        - *accessPIN*: **integer**
        - *itemID*: **integer**
        - *quantity to remove*: **integer**
        - *expiryDate*: **string** (DD-MM-YY format **'24-12-24'**)

- **Remove an item in the Inventory:** `/v1/items/remove`
    - **Method:** POST
    - **Description:** Adds a specific item to the Fridge's inventory.
    - **Parameters:**
        - *accessPIN*: **integer**
        - *itemID*: **integer**
        - *quantity to remove*: **integer**

### Delivery and ordering

- **Get all deliveries:** `/v1/delivery/`
    - **Method:** POST
    - **Description:** Returns an array of all deliveries that have completed or are expecting to be completed
    - **Parameters:**
        - *accessPIN*: **integer**

- **Verify and get a delivery:** `/v1/delivery/verify`
    - **Method:** POST
    - **Description:** Returns a delivery if it is valid
    - **Parameters:**
        - *accessPIN*: **integer**

- **Add a note to the delivery:** `/v1/delivery/note`
    - **Method:** POST
    - **Description:** Updates the note of the delivery. Need delivery driver's accessCode to be entered as the PIN.
    - **Parameters:**
        - *accessPIN*: **integer**
        - *note*: **string**

- **Mark the delivery as delivered and ready to be checked:** `/v1/delivery/delivered`
    - **Method:** POST
    - **Description:** Updates the delivery status to delivered and sends notification to head chef to check.
    - **Parameters:**
        - *accessPIN*: **integer**

- **Get current week's order:** `/v1/delivery/order`
    - **Method:** POST
    - **Description:** Returns an array of products that are in the current week's order if orderID is not given.
    - **Parameters:**
        - *accessPIN*: **integer**
        - (Optional) *orderID*: **integer**

- **Get current week's order:** `/v1/delivery/final-order`
    - **Method:** POST
    - **Description:** Returns an array of products that are in the given week's order.
    - **Parameters:**
        - *accessPIN*: **integer**
        - *orderID*: **integer**

- **Add a product to this week's order:** `/v1/delivery/add`
    - **Method:** POST
    - **Description:** Adds a product to this week's order only if the product isn't already on the order. You can
      specify either an array of products to be added or a single product by specifying a single 'productID' and '
      quantity'.
    - **Permissions:** Requires admin privileges.
    - **Parameters:**
        - *accessPIN*: **integer**
        - (Optional) *products*: **[{itemID, quantity},...]**
        - (Optional) *productID*: **integer**
        - (Optional) *quantity*: **integer**

- **Remove a product from this week's order:** `/v1/delivery/remove`
    - **Method:** POST
    - **Description:** Removes a product from this week's order.
    - **Permissions:** Requires admin privileges.
    - **Parameters:**
        - *accessPIN*: **integer**
        - *productID*: **integer**

- **Edit a product's quantity from this week's order:** `/v1/delivery/edit`
    - **Method:** POST
    - **Description:** Edits a product's quantity from this week's order.
    - **Permissions:** Requires admin privileges.
    - **Parameters:**
        - *accessPIN*: **integer**
        - *productID*: **integer**
        - *quantity*: **integer**

- **Finalise an order and its delivery:** `/v1/delivery/finalise`
    - **Method:** POST
    - **Description:** Finalises a delivery/order and marks it as complete. Will only work if the delivery is marked
      as 'delivered'. This allows to check what items the delivery driver has inserted before adding the products to the
      inventory
    - **Permissions:** Requires admin privileges.
    - **Parameters:**
        - *accessPIN*: **integer**
        - *orderID*: **integer**

## User Verification Functions

In the `verify.js` file, you'll find functions for verifying user permissions:

- **`verify`:** General verification without access permission checks.
- **`verifyAdmin`:** Verification for users with admin privileges.
- **`verifyHealth`:** Verification for users with health and safety privileges.

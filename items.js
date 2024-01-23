const router = require("express").Router();
const {verify} = require("./verify");
const {query} = require("./sql");
const {OKResponse, InternalServerErrorResponse, NotFoundResponse, MalformedBodyResponse} = require("./customResponses");
const {convertToTimestamp} = require("./Utils");

router.post("/", verify, (req,res) => {
    return query("SELECT * FROM products").then((response) => {
        return OKResponse(res, "Returned all items", response);
    }).catch((error) => {
       console.error("Error getting all products");
       return InternalServerErrorResponse(res, "Could not fetch all products. Try again later.");
    });
});

router.post("/:productName", verify, (req,res) => {
    const productName = req.params.productName;
    return query("SELECT * FROM products WHERE Name = ?", [productName]).then((response) => {
        if(response <= 0) return NotFoundResponse(res, "Item does not exist.");
        return OKResponse(res, "Item returned", response[0]);
    }).catch((error) => {
       console.error("Error getting all products");
       return InternalServerErrorResponse(res, "Could not fetch all products. Try again later.");
    });
});

router.post("/insert", verify, async (req,res) => {
    const { itemID, quantity, expiryDate } = req.body;
    const expiryDateFormat = /^\d{2}-\d{2}-\d{2}$/;

    if(!itemID) return MalformedBodyResponse(res, "'itemID' parameter is missing from request body");
    if(!quantity) return MalformedBodyResponse(res, "'quantity' parameter is missing from request body");
    if(!expiryDate) return MalformedBodyResponse(res, "'expiryDate' parameter is missing from request body");
    if (!expiryDateFormat.test(expiryDate)) return MalformedBodyResponse(res, "'expiryDate' must be in DD-MM-YY format");

    const sqlUpsert = `
        INSERT INTO inventory (itemId, quantity, expiryDate)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        quantity = quantity + VALUES(quantity);`;

    const params = [itemID, quantity, convertToTimestamp(expiryDate)];

    try {
        const result = await query(sqlUpsert, params);
        if(result <= 0) return InternalServerErrorResponse(res, "Could not update Inventory. Please try again.");
        return OKResponse(res, "Inventory updated successfully");
    } catch (err) {
        console.error(err);
        return InternalServerErrorResponse(res, "Could not update Inventory. Please try again.");
    }
});

router.post("/remove", verify, (req,res) => {

})


module.exports = router;
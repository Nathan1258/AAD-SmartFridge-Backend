const router = require("express").Router();
const { verify, verifyAdmin } = require("./verify");
const { knex } = require("./sql");
const cron = require("node-cron");
const {
  getCurrentTimestamp,
  generateUniqueAccessPIN,
  addToActivityLog,
} = require("./Utils");
const {
  MalformedBodyResponse,
  OKResponse,
  InternalServerErrorResponse,
} = require("./customResponses");

// Scheduled stock analysis and order creation every Monday at 8AM
cron.schedule("0 8 * * 1", async () => {
  console.log("Running the Delivery flow task");

  // Get last week's order ID and process the delivery
  const lastWeekOrderID = generateOrderID(1);
  if ((await processDelivery(lastWeekOrderID)) === true) {
    console.log("Delivery: " + lastWeekOrderID + " has processed successfully");
    await addToActivityLog(
      "Last week's order has been processed for delivery.",
    );
  } else {
    console.log(
      "Delivery: " +
        lastWeekOrderID +
        " has not processed successfully. Check logs",
    );
    await addToActivityLog(
      "Could not process last week's delivery. Contact your admin.",
    );
  }

  // Generate new orderID for this week
  const newOrderID = generateOrderID();
  await processLowQuantityProducts(newOrderID);

  // Show admin a list of all items expiring soon. They should check all products they want reordering and this will hit
  // a new endpoint that adds the product to this week's order.

  // Step 3: Delivery Driver Logs into Fridge
  //     - Driver uses the one-time code to access the fridge
  //     - The system invalidates the code upon successful login

  // This step is performed by the delivery driver, not by the system

  // Step 4: Driver Updates Order Status
  //     - Driver checks off items successfully replenished
  //     - System updates the order status based on driver's input
  //     - Unchecked items are noted for the head chef's review

  // updateOrderStatus();

  // Step 5: Post-Delivery Confirmation
  //     - Confirm the items not replenished
  //     - Head chef reviews and decides on actions for next order

  // confirmDeliveryAndReview();

  // Step 6: Complete Delivery Flow
  //     - Finalize the order and delivery details in the system
  //     - Prepare for next week's order and delivery cycle

  // finalizeDelivery();

  // Note: Ensure that you have error handling and logging in place for each step
});

// Run a task every 12 hours to process items near out of stock and automatically add to order
cron.schedule("0 */12 * * *", async () => {
  console.log("Processing products near depletion");
  const currentOrderID = generateOrderID();
  await processLowQuantityProducts(currentOrderID);
  console.log("Processing of products near depletion has completed.");
  console.log("Removing items that have expired");
  await processExpiredItems();
  console.log("Removed items that have expired");
});

router.post("/", verify, async (req, res) => {
  return knex("deliveries")
    .select("*")
    .then((deliveries) => {
      if (deliveries.count > 0) {
        return OKResponse(res, "All deliveries returned", deliveries);
      }
      return OKResponse(res, "No deliveries available", []);
    })
    .catch((error) => {
      console.log("Could not get all deliveries: ", error);
      return InternalServerErrorResponse(
        res,
        "Could not get all deliveries. Please try again later",
      );
    });
});

router.post("/order", verify, async (req, res) => {
  return knex("orders")
    .select("*")
    .where("orderID", generateOrderID())
    .then((orders) => {
      if (orders.count > 0) {
        return OKResponse(
          res,
          "Order for current week has been returned",
          orders,
        );
      }
      return OKResponse(res, "Order is not available", []);
    })
    .catch((error) => {
      console.log("Could not get order: ", error);
      return InternalServerErrorResponse(
        res,
        "Could not get order. Please try again later",
      );
    });
});

router.post("/add", verifyAdmin, async (req, res) => {
  const { products, productID, quantity } = req.body;
  const orderID = generateOrderID();
  let validArrayProvided = false;

  if ((!products || products.length === 0) && (!productID || !quantity)) {
    return MalformedBodyResponse(
      res,
      "'products' (an array of products) or an individual 'productID' + 'quantity' is expected in request body",
    );
  }

  if (products) {
    const response = await isValidProductsArray(products);
    if (response.valid) {
      validArrayProvided = true;
    } else {
      return MalformedBodyResponse(res, response.message);
    }
  }

  if (!validArrayProvided) {
    // Check single productID and quantity body items as array as not provided
    if (
      typeof quantity !== "number" ||
      quantity <= 0 ||
      !Number.isInteger(quantity)
    ) {
      return MalformedBodyResponse(
        res,
        "'quantity' must be a positive integer.",
      );
    }
    if (!validArrayProvided && (await isProductInOrder(productID, orderID)))
      return MalformedBodyResponse(
        res,
        "Product is already in this week's order",
      );
  }

  if (validArrayProvided) {
    let productsAdded = [];

    const insertPromises = products.map((product) => {
      return knex("orders")
        .insert({
          orderID: orderID,
          productID: product.itemID,
          quantity: product.quantity,
          orderedAt: getCurrentTimestamp(),
          status: "Processing",
          triggerType: "User added",
        })
        .then((row) => {
          if (row.length > 0) {
            productsAdded.push(product);
          }
        })
        .catch((error) => {
          console.error(
            "Could not add a product from products array to this weeks order: ",
            error,
          );
        });
    });

    return Promise.all(insertPromises)
      .then(() => {
        return OKResponse(
          res,
          "Successfully added " +
            productsAdded.length +
            " products to this week's order",
          productsAdded,
        );
      })
      .catch((error) => {
        return InternalServerErrorResponse(
          res,
          "An error occurred while adding products to this week's order. Please try again later.",
        );
      });
  }

  return knex("orders")
    .insert({
      orderID: orderID,
      productID: productID,
      quantity: quantity,
      orderedAt: getCurrentTimestamp(),
      status: "Processing",
      triggerType: "User added",
    })
    .then((row) => {
      if (row.length > 0)
        return OKResponse(res, "Product has been added to this weeks order");
      return InternalServerErrorResponse(
        res,
        "Product could not be added to this weeks order. Please try again",
      );
    })
    .catch((error) => {
      console.error("Could not add product to this weeks order: ", error);
      return InternalServerErrorResponse(
        res,
        "Could not add product to this weeks order. Please try again later.",
      );
    });
});

module.exports = router;

async function isValidProductsArray(products) {
  const orderID = generateOrderID();

  if (!Array.isArray(products)) {
    return { valid: false, message: "'products' is not a valid array." };
  }
  for (const product of products) {
    // Check if productID and quantity exist
    if (!product.itemID || !product.quantity) {
      return {
        valid: false,
        message:
          "'itemID' and 'quantity' should exist in each element of the array.",
      };
    }
    // Check if itemID is a valid integer
    if (
      typeof product.itemID !== "number" ||
      product.productID <= 0 ||
      !Number.isInteger(product.itemID)
    ) {
      return {
        valid: false,
        message:
          "one 'itemID' item within the array is not a valid positive integer.",
      };
    }
    // Check if quantity is a valid integer
    if (
      typeof product.quantity !== "number" ||
      product.quantity <= 0 ||
      !Number.isInteger(product.quantity)
    ) {
      return {
        valid: false,
        message:
          "one 'quantity' item within the array is not a valid positive integer.",
      };
    }
    // Check if itemID points to a valid product
    if (!(await isProductValid(product.itemID))) {
      return {
        valid: false,
        message:
          "one give 'itemID' item does not associate to a valid product.",
      };
    }

    if (await isProductInOrder(product.itemID, orderID)) {
      return {
        valid: false,
        message:
          "One or more products provided in the array is already in this week's order.",
      };
    }
  }
  return { valid: true, message: "" };
}

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return [d.getUTCFullYear(), weekNo];
}

function generateOrderID(offsetWeeks = 0) {
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() - offsetWeeks * 7);

  const [year, week] = getWeekNumber(currentDate);
  const shortYear = year.toString().slice(-2);
  const formattedWeek = week.toString().padStart(2, "0");
  return formattedWeek + shortYear;
}

async function processDelivery(orderID) {
  const accessCode = await generateUniqueAccessPIN();
  const orderTotalItems = await getOrderTotalItems(orderID);
  const orderTotalAmount = await processOrderTotalAmount(orderID);
  const formattedTotalAmount = "£" + orderTotalAmount.toFixed(2);

  return knex("deliveries")
    .insert({
      orderID: orderID,
      deliveryDate: getCurrentTimestamp(),
      accessCode: accessCode,
      itemsToDeliver: orderTotalItems,
      status: "Processed",
      totalCost: formattedTotalAmount,
    })
    .then((order) => {
      return order >= 1;
    })
    .catch((error) => {
      console.error("Error processing new delivery", error);
      return false;
    });
}

async function getOrderTotalItems(orderID) {
  return knex("orders")
    .count("orderID as count")
    .where("orderID", orderID)
    .first()
    .then((count) => {
      return count.count;
    })
    .catch((error) => {
      console.error("Could not fetch total item count", error);
      return 0;
    });
}

async function processOrderTotalAmount(orderID) {
  try {
    const orderItems = await knex("orders")
      .select("productID", "quantity")
      .where("orderID", orderID);

    return await Promise.all(
      orderItems.map(async (item) => {
        const product = await knex("products")
          .select("Price")
          .where("productID", item.productID)
          .first();
        const price = parseFloat(product.Price.replace("£", ""));
        return price * item.quantity;
      }),
    ).then((amounts) => {
      return amounts.reduce((acc, amount) => acc + amount, 0);
    });
  } catch (error) {
    console.error("Could not fetch total order amount", error);
  }
}

async function processExpiredItems() {
  const currentDate = new Date().toISOString().slice(0, 19).replace("T", " ");

  const expiredItems = await knex("inventory")
    .where("expiryDate", "<", currentDate)
    .select("itemID");

  await knex("inventory").where("expiryDate", "<", currentDate).del();

  for (const item of expiredItems) {
    await addToActivityLog(
      null,
      `Item ${item.itemID} has been removed from the fridge as it has expired`,
    );
  }
}

async function processLowQuantityProducts(newOrderID) {
  try {
    const products = await knex("inventory")
      .select("*")
      .where("quantity", "<", 3);
    for (const product of products) {
      const alreadyAdded = await isProductInOrder(product.itemID, newOrderID);
      if (!alreadyAdded) {
        await addLowQuantityProduct(product, newOrderID);
      }
    }
  } catch (error) {
    console.error("Could not fetch all low quantity products: ", error);
  }
}

function addLowQuantityProduct(product, orderID) {
  return knex("orders")
    .insert({
      orderID: orderID,
      productID: product.itemID,
      quantity: 10,
      orderedAt: getCurrentTimestamp(),
      status: "Processing",
      triggerType: "System trigger",
    })
    .then((rows) => {
      return rows > 1;
    })
    .catch((error) => {
      console.error("Error adding product to order", error);
      return false;
    });
}

function isProductValid(productID) {
  return knex("products")
    .select("*")
    .where("productID", productID)
    .then((product) => {
      return product.length > 0;
    })
    .catch((error) => {
      console.log("Could not check if product is valid", error);
    });
}

function isProductInOrder(productID, orderID) {
  return knex("orders")
    .select("*")
    .where({
      orderID: orderID,
      productID: productID,
    })
    .then((rows) => {
      return rows.length > 0;
    })
    .catch((error) => {
      console.error("Error checking product in order", error);
      return false;
    });
}

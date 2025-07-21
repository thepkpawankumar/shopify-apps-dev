export const fetchOrdersData = async (admin, stats, orderDateQuery, limit, cursor = null) => {
    const response = await admin.graphql(
        `#graphql
      query ($numOfOrders: Int!, $cursor: String, $orderDateQuery: String) {
        shop{
          name
          currencyCode
        }
        orders(query:  $orderDateQuery, first: $numOfOrders, after: $cursor) {
          edges {
            node {
              id
              name
              createdAt
              updatedAt
              closedAt
              returnStatus
              fulfillments {
                id
                status
                deliveredAt
                displayStatus
                fulfillmentLineItems (first: 20) {
                edges {
                  node {
                    id
                    quantity
                  }
                }
                }
  
              }
              fullyPaid
              refundable
  
              displayFinancialStatus
              displayFulfillmentStatus
              returns(first: 200){
                edges {
                  node {
                    id
                    status
                    returnShippingFees{
                      id
                      amountSet{
                          shopMoney {
                          amount
                        }
                      }
                    }
                  }
                }
              }
              refunds(first: 20) {
                id
                totalRefundedSet{
                  shopMoney {
                    amount
                  }
                }
                refundLineItems(first: 20) {
                  edges {
                    node {
                      lineItem {
                        id
                        quantity
                      }
                    }
                  }
                }
  
  
              }
            }
          },
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }`,
      {
        variables: {
          numOfOrders: limit,
          cursor: cursor,
          orderDateQuery: orderDateQuery
        }
      }
    );
  
    const responseJson = await response.json();
  
    const shop = responseJson?.data?.shop;
    const ordersData = responseJson?.data?.orders?.edges;
    const pageInfo = responseJson?.data?.orders?.pageInfo;
  
    const completedOrdersCount = ordersData.filter(order =>
      order.node.closedAt !== null &&
      order.node.displayFulfillmentStatus === "FULFILLED")
      ?.length || 0;
  
    const openOrdersCount = ordersData.filter(order =>
      order.node.displayFulfillmentStatus === "UNFULFILLED")
      ?.length || 0;
  
    const partialOrdersSentCount = ordersData.filter(order =>
      order.node.displayFulfillmentStatus === "PARTIALLY_FULFILLED")
      ?.length || 0;
  
    const shippedOrdersCount = ordersData.filter(order =>
      order.node.fulfillments.length > 0)
      ?.length || 0;
  
    const returnsReceivedCount = ordersData.filter(order =>
      order.node.returns?.edges.length > 0)
      ?.length || 0;
        
    const returnsPaidoutCount = ordersData.filter(order =>
     (order.node.returnStatus === "RETURNED" || order.node.returnStatus === "IN_PROGRESS") && order.node.refunds.length > 0)
      ?.length || 0;
  
    ordersData.forEach(order => {
  
      if(order.node?.fulfillments) {
  
        order.node.fulfillments.forEach(fulfillment => {
          if(fulfillment.fulfillmentLineItems) {
            let fulfillmentLineItems = fulfillment.fulfillmentLineItems?.edges;
            fulfillmentLineItems.forEach(fulfillmentLineItem => {
              stats.inbound_fullfilment_qty.value += fulfillmentLineItem.node.quantity;
            })
          }
        })
        
      }
      if(order.node?.refunds) {
  
        order.node.refunds.forEach(refund => {
          if(refund?.refundLineItems) {
            let refundLineItems = refund.refundLineItems?.edges;
            refundLineItems.forEach(refundLineItem => {
              stats.refund_outbound_qty.value += refundLineItem.node.lineItem.quantity;
            })
          }
  
          if(refund?.totalRefundedSet) {
            stats.total_refund_amount.value += Number.parseFloat(refund.totalRefundedSet.shopMoney.amount);
          }
        })
        
      }
  
    });
       
    stats.total_refund_amount.value = Number.parseFloat(stats.total_refund_amount.value).toFixed(2)
    stats.orders_completed.value += completedOrdersCount;
    stats.open_orders.value += openOrdersCount;
    stats.partial_orders_sent.value += partialOrdersSentCount;
    stats.orders_shipped.value += shippedOrdersCount;
    stats.returns_received.value += returnsReceivedCount;
    stats.returns_paid_out.value += returnsPaidoutCount;
  
    if(pageInfo && pageInfo.hasNextPage){
      return await fetchOrdersData(admin, stats, orderDateQuery, limit, pageInfo.endCursor);
    }
  
    return {shop: shop, stats: stats};
  };
  
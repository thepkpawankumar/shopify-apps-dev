import {
  reactExtension,
  useApi,
  useCartLineTarget,
  Text
} from "@shopify/ui-extensions-react/checkout";
import { useEffect, useState } from "react";

// 1. Choose an extension target
export default reactExtension("customer-account.order-status.cart-line-item.render-after", () => (
  <Extension />
));

function Extension() {
  
  const { shop } = useApi();
  const [currency, setCurrency] = useState("");
  const {
     cost: {
        totalAmount: {
            amount: lineItemAmount
        }
     }
   } = useCartLineTarget();


   console.log({lineItemAmount});
   useEffect(() => {

    fetchShopMeta(shop);

   }, [shop])
   
   const fetchShopMeta = async ({storefrontUrl}) => {
      let response = await fetch(`${storefrontUrl}/meta.json`);
      response = await response.json();

      if(response && response?.money_format) {
        shop.moneyFormat = response?.money_format
      }
      if(response && response?.currency) {
        shop.currency = response?.currency
        setCurrency(response?.currency);
      }
    

   }
   //console.log({lineItemAmount});

   
  // 3. Render a UI
  return (
    
      <Text  size="12px" appearance="subdued">Amount order status: {currency} {lineItemAmount}</Text>
    
  );
}
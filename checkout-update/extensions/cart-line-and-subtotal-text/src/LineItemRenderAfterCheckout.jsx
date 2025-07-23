import {
  reactExtension,
  useApi,
  useCartLineTarget,
  Text
} from "@shopify/ui-extensions-react/checkout";
import { useEffect } from "react";

// 1. Choose an extension target
export default reactExtension("purchase.checkout.cart-line-item.render-after", () => (
  <Extension />
));

function Extension() {
  
  const { shop } = useApi();
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
      }
      console.log(shop);

   }
   //console.log({lineItemAmount});

  // 3. Render a UI
  return (
    
      <Text  size="12px" appearance="subdued">Amount: {shop.currency} {lineItemAmount}</Text>
    
  );
}
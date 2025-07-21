import {useFetcher, useLoaderData} from "@remix-run/react";
import {BlockStack, Button, Card, DatePicker, Grid, InlineStack, Layout, Page, Popover, Text,} from "@shopify/polaris";
import {authenticate} from "../shopify.server";
import {fetchOrdersData} from "../api/orders.server.js";
import {useCallback, useEffect, useState} from "react";

export const loader = async ({request}) => {
  const {admin} = await authenticate.admin(request);

  const url = new URL(request.url)
  const limit = 50;
 
  const fromDate = url.searchParams.get('start') ? url.searchParams.get('start').split('.')[0] : new Date().toISOString().split('T')[0] + `T00:00:00Z`;
  const toDate = url.searchParams.get('end') ? url.searchParams.get('end').split('.')[0] : new Date().toISOString().split('T')[0] + `T23:59:59Z`;
  let orderDateQuery = `created_at:>'${fromDate}' AND created_at:<'${toDate}'`;

  const stats = {
    orders_completed: { /* How many orders were completed and shipped today? (3PL PROVIDER) */
      value: 0,
      label: "Orders completed",
    },
    orders_shipped: { /* How many orders were completed and shipped today? (3PL PROVIDER) */
      value: 0,
      label: "Orders shipped",
    },
    open_orders: {/* Number of orders that still need to be processed and shipped.*/
      value: 0,
      label: "Open orders",
    },
    returns_received: {/* ⁠Returns received today - How many returns have been received today? */
      value: 0,
      label: "Returns received",
    },
    partial_orders_sent: { /* Number of partial orders that have arrived today.
    In combination with shortages - How many items are currently out of stock? */
      value: 0,
      label: "Partial orders sent",
    },
    returns_paid_out: {/* Number of returns processed and refunded today. (WE USE 8RETURNS, THEY HAVE AN API) */
      value: 0,
      label: "Returns paid out",
    },
    inbound_fullfilment_qty: {/* Inbound quantities means total quantities of all products ordered */
      value: 0,
      label: "Inbound fullfilment qty",
   },
   refund_outbound_qty: {/* Refund outbound quantities means how many quantities of all products are refunded for */
   value: 0,
   label: "Refund outbound qty",
  },
  total_refund_amount: { /* Total refund amount */
    value: 0,
    label: "Total refund amount"
  }
  };

  const response = await fetchOrdersData(admin, stats, orderDateQuery, limit);

  return {
    shop: response?.shop,
    stats: response.stats,
    range: {
      start: fromDate,
      end: toDate
    }
  };
};

export default function Index() {
  const loaderData = useLoaderData();
  const statsFetcher = useFetcher({key: '_stats_fetcher_'})
  const statsFetcherData = statsFetcher?.data

  const stats = statsFetcherData?.stats || loaderData?.stats
  
  console.log(stats);

  const shop = statsFetcherData?.shop || loaderData?.shop
  const range = statsFetcherData?.range || loaderData?.range

  const [{month, year}, setDate] = useState({month: new Date(range.start).getMonth(), year:  new Date(range.end).getFullYear()});
  const [popoverActive, setPopoverActive] = useState(false);
  const [selectedDates, setSelectedDates] = useState({
    start: new Date(range.start),
    end: new Date(range.end),
  });

  const statCards = [
    'open_orders',
    'orders_shipped',
    'partial_orders_sent',
    'orders_completed',
    'returns_received',
    'returns_paid_out',
    'inbound_fullfilment_qty',
    'refund_outbound_qty',
    'total_refund_amount'
  ];

  const handleMonthChange = useCallback(
    (month, year) => {
      setDate({month, year})
    },
    [],
  );

  const togglePopoverActive = useCallback(
    () => setPopoverActive((popoverActive) => !popoverActive),
    [],
  );

  useEffect(() => {
    statsFetcher.load(`/app?index&start=${selectedDates.start.toISOString()}&end=${selectedDates.end.toISOString()}`)
  }, [selectedDates.start, selectedDates.end])

  const activator = (
    <Button onClick={togglePopoverActive} disclosure>
      {new Date(selectedDates.start).toDateString()} - {new Date(selectedDates.end).toDateString()}
    </Button>
  );

  return (
    <Page fullWidth>
        <Layout>
          <Layout.Section>
            <BlockStack gap={"500"}>
              <InlineStack align={"space-between"}>
              <Text as={"h2"} variant={"headingLg"} tone={"base"}>{shop?.name}</Text>
                <Popover
                  active={popoverActive}
                  activator={activator}
                  onClose={togglePopoverActive}
                >
                  <Card>
                  <DatePicker
                    month={month}
                    year={year}
                    onChange={setSelectedDates}
                    onMonthChange={handleMonthChange}
                    selected={selectedDates}
                    multiMonth
                    allowRange
                  />
                  </Card>
                </Popover>
              </InlineStack>
              <Grid>
                {statCards.map(key => <Grid.Cell key={key} columnSpan={{xs: 3, sm: 3, md: 3, lg: 3, xl: 3}}>
                  <Card>
                    <BlockStack gap={"300"}>
                      <Text as={"p"} variant={"headingMd"}>{stats?.[key]?.label || key}</Text>
                      <p>{ key == 'total_refund_amount' &&  stats?.[key]?.value ? `${shop.currencyCode} `: ""}
                      {stats?.[key]?.value|| 'N/A'}</p>
                    </BlockStack>
                  </Card>
                </Grid.Cell>)}
              </Grid>
            </BlockStack>
          </Layout.Section>
        </Layout>
    </Page>
  );
}
# Mobile GraphQL Integration

## Overview

GraphQL on mobile requires careful consideration of caching, offline support, pagination, and code generation to deliver a fast, reliable data-fetching experience. This guide covers Apollo/Relay client setup, query batching, pagination strategies, normalized caching, subscriptions, optimistic updates, and code generation for iOS, Android, Flutter, and React Native.

## Client Setup

### Apollo Kotlin (Android)

```kotlin
// ApolloClient.kt
import com.apollographql.apollo3.ApolloClient
import com.apollographql.apollo3.cache.normalized.api.MemoryCacheFactory
import com.apollographql.apollo3.cache.normalized.normalizedCache
import com.apollographql.apollo3.network.okHttpClient
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor

object GraphQLClientProvider {
    fun create(): ApolloClient {
        val okHttpClient = OkHttpClient.Builder()
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            })
            .addInterceptor { chain ->
                val request = chain.request().newBuilder()
                    .addHeader("Authorization", "Bearer ${TokenProvider.getToken()}")
                    .build()
                chain.proceed(request)
            }
            .connectTimeout(10, java.util.concurrent.TimeUnit.SECONDS)
            .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
            .build()

        return ApolloClient.Builder()
            .serverUrl("https://api.example.com/graphql")
            .okHttpClient(okHttpClient)
            .normalizedCache(MemoryCacheFactory(maxSizeBytes = 10 * 1024 * 1024))
            .build()
    }
}
```

### Apollo iOS

```swift
// GraphQLClient.swift
import Apollo
import ApolloAPI

class GraphQLService {
    static let shared = GraphQLService()

    private(set) lazy var client: ApolloClient = {
        let cache = InMemoryNormalizedCache()
        let store = ApolloStore(cache: cache)

        let transport = RequestChainNetworkTransport(
            interceptorProvider: DefaultInterceptorProvider(store: store),
            endpointURL: URL(string: "https://api.example.com/graphql")!
        )

        return ApolloClient(
            networkTransport: transport,
            store: store
        )
    }()
}
```

### Apollo Flutter

```dart
// graphql_client.dart
import 'package:apollo_client/apollo_client.dart';
import 'package:ferry/ferry.dart';
import 'package:gql_http_link/gql_http_link.dart';
import 'package:gql_error_link/gql_error_link.dart';
import 'package:normalize/normalize.dart';

class GraphQLClientProvider {
  static Client create() {
    final link = Link.from([
      AuthLink(getToken: () => TokenProvider.getToken()),
      ErrorLink(
        onException: (request, forward, exception) {
          if (exception is UnauthorizedException) {
            TokenProvider.refreshToken();
          }
          return forward(request);
        },
      ),
      HttpLink('https://api.example.com/graphql'),
    ]);

    final cache = NormalizedInMemoryCache(
      dataIdFromObject: (data) {
        if (data['__typename'] != null && data['id'] != null) {
          return '${data['__typename']}:${data['id']}';
        }
        return null;
      },
    );

    return Client(
      link: link,
      cache: cache,
      defaultFetchPolicies: {
        OperationType.query: FetchPolicy.CacheFirst,
      },
    );
  }
}
```

### Apollo React Native

```typescript
// apollo-client.ts
import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { AsyncStorageWrapper } from '@apollo/client/cache';
import AsyncStorage from '@react-native-async-storage/async-storage';

const httpLink = createHttpLink({
  uri: 'https://api.example.com/graphql',
});

const authLink = setContext(async (_, { headers }) => {
  const token = await TokenProvider.getToken();
  return {
    headers: {
      ...headers,
      Authorization: token ? `Bearer ${token}` : '',
    },
  };
});

const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      if (err.extensions?.code === 'UNAUTHENTICATED') {
        TokenProvider.refreshToken();
        return forward(operation);
      }
    }
  }
  if (networkError) {
    console.error(`Network error: ${networkError.message}`);
  }
});

const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        orders: {
          merge(existing, incoming) {
            return incoming;
          },
        },
      },
    },
  },
});

export const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
  },
});
```

## Query Batching

### Automatic Batching

```kotlin
// Apollo Kotlin supports automatic query batching via the BatchingInterceptor
val batchingClient = ApolloClient.Builder()
    .serverUrl("https://api.example.com/graphql")
    .addInterceptor(BatchingInterceptor(
        maxBatchSize = 10,
        maxBatchIntervalMs = 50,
    ))
    .build()
```

```typescript
// Apollo React Native batching
import { BatchHttpLink } from '@apollo/client/link/batch-http';

const batchLink = new BatchHttpLink({
  uri: 'https://api.example.com/graphql',
  batchMax: 10,
  batchInterval: 50,
});
```

## Pagination

### Cursor-Based Pagination

```graphql
# GraphQL schema for cursor pagination
type Query {
  orders(
    first: Int!
    after: String
    before: String
  ): OrderConnection!
}

type OrderConnection {
  edges: [OrderEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type OrderEdge {
  node: Order!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

```kotlin
// Android pagination with Apollo
class OrderPaginationDataSource(private val apolloClient: ApolloClient) {
    private val pageSize = 20
    private var afterCursor: String? = null
    var hasMore = true
        private set

    suspend fun loadNextPage(): List<Order> {
        if (!hasMore) return emptyList()

        val response = apolloClient.query(OrdersQuery(
            first = pageSize,
            after = afterCursor,
        )).execute()

        val data = response.dataAssertNoErrors
        afterCursor = data.orders.pageInfo.endCursor
        hasMore = data.orders.pageInfo.hasNextPage

        return data.orders.edges.map { it.node }
    }
}
```

```typescript
// React Native pagination with Apollo
import { useQuery, gql } from '@apollo/client';

const GET_ORDERS = gql`
  query GetOrders($first: Int!, $after: String) {
    orders(first: $first, after: $after) {
      edges {
        node {
          id
          total
          status
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

function useOrderPagination(pageSize: number = 20) {
  const { data, fetchMore, loading } = useQuery(GET_ORDERS, {
    variables: { first: pageSize },
    notifyOnNetworkStatusChange: true,
  });

  const loadMore = async () => {
    if (!data?.orders?.pageInfo?.hasNextPage) return;

    await fetchMore({
      variables: {
        after: data.orders.pageInfo.endCursor,
        first: pageSize,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return {
          orders: {
            ...fetchMoreResult.orders,
            edges: [
              ...prev.orders.edges,
              ...fetchMoreResult.orders.edges,
            ],
          },
        };
      },
    });
  };

  return {
    orders: data?.orders?.edges?.map((e: any) => e.node) ?? [],
    loading,
    loadMore,
    hasMore: data?.orders?.pageInfo?.hasNextPage ?? false,
  };
}
```

## Caching Strategies

### Normalized Cache Configuration

```typescript
// Apollo React Native normalized cache
const cache = new InMemoryCache({
  typePolicies: {
    Order: {
      keyFields: ['id'],
      fields: {
        items: {
          merge(existing, incoming) {
            return incoming;
          },
        },
      },
    },
    User: {
      keyFields: ['id'],
    },
    Query: {
      fields: {
        orders: {
          keyArgs: false,
          merge(existing, incoming) {
            if (!existing) return incoming;
            const existingEdges = existing.edges ?? [];
            const incomingEdges = incoming.edges ?? [];
            return {
              ...incoming,
              edges: [...existingEdges, ...incomingEdges],
            };
          },
        },
        order: {
          read(_, { args, toReference }) {
            return toReference({
              __typename: 'Order',
              id: args?.id,
            });
          },
        },
      },
    },
  },
});
```

### Cache Persistence

```typescript
// React Native cache persistence
import { persistCache, AsyncStorageWrapper } from '@apollo/client/cache';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function initializeApollo() {
  const cache = new InMemoryCache();

  await persistCache({
    cache,
    storage: new AsyncStorageWrapper(AsyncStorage),
    debug: __DEV__,
    maxSize: 1048576, // 1MB max cache
  });

  return new ApolloClient({
    cache,
    link: authLink.concat(httpLink),
  });
}
```

## Subscriptions

### WebSocket Setup

```kotlin
// Apollo Kotlin subscriptions
val subscriptionClient = ApolloClient.Builder()
    .serverUrl("https://api.example.com/graphql")
    .webSocketServerUrl("wss://api.example.com/graphql")
    .subscriptionManager(WebSocketSubscriptionManager(
        reconnectWhen = { it is GraphQLException }
    ))
    .build()

// Subscribe to order updates
subscriptionClient.subscription(OrderStatusSubscription())
    .toFlow()
    .collect { response ->
        val orderUpdate = response.dataAssertNoErrors.orderStatusChanged
        handleOrderUpdate(orderUpdate)
    }
```

```typescript
// Apollo React Native subscriptions
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';

const wsLink = new GraphQLWsLink(
  createClient({
    url: 'wss://api.example.com/graphql',
    connectionParams: async () => ({
      authToken: await TokenProvider.getToken(),
    }),
    retryAttempts: 5,
    shouldRetry: () => true,
    on: {
      connected: () => console.log('Subscription connected'),
      disconnected: () => console.log('Subscription disconnected'),
      error: (err) => console.error('Subscription error', err),
    },
  })
);

// Split link based on operation type
import { split, HttpLink } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink
);
```

## Optimistic Updates

### Optimistic Mutation Pattern

```typescript
// React Native optimistic update
import { useMutation, gql } from '@apollo/client';

const UPDATE_ORDER_STATUS = gql`
  mutation UpdateOrderStatus($id: ID!, $status: OrderStatus!) {
    updateOrderStatus(id: $id, status: $status) {
      id
      status
      updatedAt
    }
  }
`;

function useOptimisticOrderUpdate() {
  const [updateOrder] = useMutation(UPDATE_ORDER_STATUS, {
    update(cache, { data: { updateOrderStatus } }) {
      cache.modify({
        id: cache.identify(updateOrderStatus),
        fields: {
          status() {
            return updateOrderStatus.status;
          },
          updatedAt() {
            return updateOrderStatus.updatedAt;
          },
        },
      });
    },
    optimisticResponse: ({ id, status }) => ({
      __typename: 'Mutation',
      updateOrderStatus: {
        __typename: 'Order',
        id,
        status,
        updatedAt: new Date().toISOString(),
      },
    }),
  });

  return updateOrder;
}
```

## Offline Mutations

### Mutation Queue

```typescript
// Offline mutation queue
import NetInfo from '@react-native-community/netinfo';

class OfflineMutationQueue {
  private queue: QueuedMutation[] = [];
  private isProcessing = false;

  async enqueue(mutation: QueuedMutation) {
    this.queue.push(mutation);
    await this.persistQueue();

    if (await this.isOnline()) {
      this.processQueue();
    }
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const mutation = this.queue[0];
      try {
        await mutation.execute();
        this.queue.shift();
        await this.persistQueue();
      } catch (error) {
        if (error instanceof NetworkError) {
          break; // Stop processing, wait for connectivity
        }
        // Non-retryable error - remove from queue
        this.queue.shift();
        await this.persistQueue();
        this.notifyError(mutation, error);
      }
    }

    this.isProcessing = false;
  }

  private async isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  }

  private async persistQueue() {
    await AsyncStorage.setItem('mutation_queue', JSON.stringify(this.queue));
  }

  private async restoreQueue() {
    const stored = await AsyncStorage.getItem('mutation_queue');
    if (stored) {
      this.queue = JSON.parse(stored);
    }
  }

  private notifyError(mutation: QueuedMutation, error: any) {
    console.error(`Mutation failed: ${mutation.name}`, error);
  }
}

interface QueuedMutation {
  id: string;
  name: string;
  execute: () => Promise<any>;
  timestamp: number;
}
```

## Code Generation

### GraphQL Code Generator Configuration

```yaml
# codegen.yml
schema: 'https://api.example.com/graphql'
documents: './src/**/*.graphql'
generates:
  ./src/generated/graphql.ts:
    plugins:
      - 'typescript'
      - 'typescript-operations'
      - 'typescript-react-apollo'
    config:
      withHooks: true
      withResultType: true
      preResolveTypes: true
      dedupeOperationSuffix: true
      scalars:
        DateTime: string
        JSON: Record<string, any>
        UUID: string

  ./src/generated/schema.graphql:
    plugins:
      - 'schema-ast'
```

### Apollo CLI Codegen

```bash
# Apollo codegen for iOS
./Pods/Apollo/apollo-ios-cli generate \
  --path=./GraphQL/API.swift \
  --schema=./schema.graphqls \
  --operation-ids=./operationIDs.json

# Apollo codegen for Android
./gradlew :app:generateApolloSources

# GraphQL Code Generator (universal)
npx graphql-codegen --config codegen.yml
```

## Error Handling

### Unified Error Handler

```typescript
// Unified GraphQL error handling
type GraphQLResult<T> =
  | { kind: 'success'; data: T }
  | { kind: 'partial'; data: Partial<T>; errors: GraphQLError[] }
  | { kind: 'failure'; errors: GraphQLError[]; networkError?: NetworkError };

function handleGraphQLResponse<T>(
  response: ApolloQueryResult<T>
): GraphQLResult<T> {
  if (response.error) {
    if (response.data) {
      return {
        kind: 'partial',
        data: response.data as Partial<T>,
        errors: response.error.graphQLErrors,
      };
    }
    return {
      kind: 'failure',
      errors: response.error.graphQLErrors,
      networkError: response.error.networkError as NetworkError,
    };
  }
  return { kind: 'success', data: response.data };
}

// Usage in components
function OrderList() {
  const { loading, error, data } = useQuery(GET_ORDERS);

  if (loading) return <LoadingSpinner />;

  const result = handleGraphQLResponse({ loading, error, data });
  switch (result.kind) {
    case 'success':
      return <OrderListItems orders={result.data.orders} />;
    case 'partial':
      // Show partial data with warning
      return (
        <>
          <OfflineBanner />
          <OrderListItems orders={result.data.orders ?? []} />
        </>
      );
    case 'failure':
      return <ErrorState message="Failed to load orders" />;
  }
}
```

## Key Points

- Mobile GraphQL clients (Apollo Kotlin, Apollo iOS, Apollo Flutter, Apollo React Native) provide normalized caching, subscriptions, and pagination out of the box
- Cursor-based pagination with Relay-style connections is the mobile standard for infinite scroll lists
- Normalized cache with type policies enables automatic cache updates after mutations without manual refetching
- Persistent cache storage (AsyncStorage for RN, MMKV for native) enables instant data on cold start
- Subscriptions via WebSocket with automatic reconnection enable real-time updates with minimal battery impact
- Optimistic updates provide instant UI feedback while mutations complete asynchronously
- Offline mutation queues store pending writes during connectivity loss and replay on reconnection
- Code generation from GraphQL schema produces type-safe queries, mutations, and hooks for all platforms
- Error handling must support three states: full success, partial data with errors, and complete failure
- Query batching reduces network overhead by combining multiple operations into a single HTTP request

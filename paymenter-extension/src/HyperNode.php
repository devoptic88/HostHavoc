<?php

namespace App\Extensions\Servers\HyperNode;

use App\Classes\Extension\Server;
use App\Models\Order\Order;
use App\Models\Order\OrderProduct;
use Illuminate\Support\Facades\Http;

/**
 * Relays Paymenter's order lifecycle into HyperNode instead of provisioning
 * anything itself — HyperNode owns every bit of game-specific provisioning
 * logic (egg/nest mapping, Rust install profiles, Minecraft EULA, subuser
 * invites, DNS). This extension's only job is: on each lifecycle event, tell
 * HyperNode which of *its own* orders this is, via the hypernode_order_id
 * metadata HyperNode stamped onto the order when it created it through the
 * Paymenter admin API (see hypernode/src/lib/paymenter.ts).
 */
class HyperNode extends Server
{
    public function getConfig(array $values = []): array
    {
        return [
            [
                'name' => 'hypernode_url',
                'friendlyName' => 'HyperNode URL',
                'type' => 'text',
                'description' => 'Base URL of the HyperNode app, e.g. https://app.hypernode.gg',
                'required' => true,
            ],
            [
                'name' => 'extension_secret',
                'friendlyName' => 'Extension shared secret',
                'type' => 'password',
                'description' => 'Must match PAYMENTER_EXTENSION_SECRET in HyperNode Admin -> Settings.',
                'required' => true,
            ],
        ];
    }

    /** No per-product config needed — every field customers configure lives on HyperNode's own checkout UI. */
    public function getProductConfig(?OrderProduct $orderProduct = null): array
    {
        return [];
    }

    private function hypernodeOrderId(OrderProduct $orderProduct): ?string
    {
        return $orderProduct->order->metadata['hypernode_order_id']
            ?? $orderProduct->metadata['hypernode_order_id']
            ?? null;
    }

    private function relay(OrderProduct $orderProduct, string $action): void
    {
        $hypernodeOrderId = $this->hypernodeOrderId($orderProduct);
        if (!$hypernodeOrderId) {
            throw new \Exception("No hypernode_order_id on Paymenter order {$orderProduct->order_id} — was it created by HyperNode's checkout?");
        }

        $config = $this->config;
        $baseUrl = rtrim($config['hypernode_url'], '/');

        $response = Http::withHeaders([
            'X-Paymenter-Secret' => $config['extension_secret'],
        ])->post("{$baseUrl}/api/paymenter/{$action}", [
            'hypernodeOrderId' => $hypernodeOrderId,
            'paymenterOrderId' => $orderProduct->order_id,
        ]);

        if (!$response->successful()) {
            throw new \Exception("HyperNode {$action} call failed ({$response->status()}): {$response->body()}");
        }
    }

    public function createServer(OrderProduct $orderProduct): void
    {
        $this->relay($orderProduct, 'provision');
    }

    public function suspendServer(OrderProduct $orderProduct): void
    {
        $this->relay($orderProduct, 'suspend');
    }

    public function unsuspendServer(OrderProduct $orderProduct): void
    {
        $this->relay($orderProduct, 'unsuspend');
    }

    public function terminateServer(OrderProduct $orderProduct): void
    {
        $this->relay($orderProduct, 'terminate');
    }
}

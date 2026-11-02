# Script para configurar Produtos, Precos e Payment Links na Stripe
param(
    [string]$SecretKey = $env:STRIPE_SECRET_KEY
)

$headers = @{
    "Authorization" = "Bearer $SecretKey"
}

Write-Host "Verificando conexao com a Stripe..."
try {
    $balance = Invoke-RestMethod -Uri "https://api.stripe.com/v1/balance" -Headers $headers -Method Get
    $mode = if ($balance.livemode) { "Live" } else { "Test" }
    Write-Host "Conexao bem sucedida com a Stripe! Modo: $mode"
} catch {
    Write-Error "Erro ao conectar com a Stripe: $_"
    exit 1
}

# 1. Definir os planos da Kriativa Software
$plans = @(
    @{
        name = "Kriativa Care: Suporte & Manutencao"
        description = "Sustentacao tecnica continua, atualizacoes de seguranca, backup em nuvem e suporte prioritario para seu site ou aplicacao web."
        type = "recurring"
        interval = "month"
        amount = 98000 # R$ 980,00 em centavos
        currency = "brl"
    },
    @{
        name = "Kriativa Growth: Software & Design Squad"
        description = "Horas dedicadas mensais para novas features, evolucao de UI/UX, otimizacao de conversao e engenharia full-stack sob demanda."
        type = "recurring"
        interval = "month"
        amount = 249000 # R$ 2.490,00 em centavos
        currency = "brl"
    },
    @{
        name = "Entrada de Projeto / Milestone"
        description = "Entrada inicial de 50% ou pagamento de entrega/milestone para projetos de software sob medida, landing pages ou identidade visual."
        type = "one_time"
        amount = 150000 # R$ 1.500,00 em centavos
        currency = "brl"
    },
    @{
        name = "Consultoria & Diagnostico Digital"
        description = "Sessao estrategica com analise completa de produto, arquitetura de software, UI/UX audit e plano de acao para o seu negocio."
        type = "one_time"
        amount = 49000 # R$ 490,00 em centavos
        currency = "brl"
    }
)

$results = @()

foreach ($plan in $plans) {
    Write-Host "Criando produto: $($plan.name)..."
    $prodBody = @{
        name = $plan.name
        description = $plan.description
    }
    $product = Invoke-RestMethod -Uri "https://api.stripe.com/v1/products" -Headers $headers -Method Post -Body $prodBody
    
    Write-Host "Criando preco para o produto $($product.id)..."
    $priceBody = @{
        product = $product.id
        unit_amount = $plan.amount
        currency = $plan.currency
    }
    if ($plan.type -eq "recurring") {
        $priceBody["recurring[interval]"] = $plan.interval
    }
    
    $price = Invoke-RestMethod -Uri "https://api.stripe.com/v1/prices" -Headers $headers -Method Post -Body $priceBody
    
    Write-Host "Gerando Payment Link com Coleta de CPF/CNPJ..."
    $plBody = @{
        "line_items[0][price]" = $price.id
        "line_items[0][quantity]" = 1
        "tax_id_collection[enabled]" = "true"
        "billing_address_collection" = "required"
        "allow_promotion_codes" = "true"
    }
    
    try {
        $paymentLink = Invoke-RestMethod -Uri "https://api.stripe.com/v1/payment_links" -Headers $headers -Method Post -Body $plBody
    } catch {
        Write-Warning "Falha ao criar link com tax_id_collection, tentando basico: $_"
        $plBodyBasic = @{
            "line_items[0][price]" = $price.id
            "line_items[0][quantity]" = 1
        }
        $paymentLink = Invoke-RestMethod -Uri "https://api.stripe.com/v1/payment_links" -Headers $headers -Method Post -Body $plBodyBasic
    }
    
    $results += [PSCustomObject]@{
        Name = $plan.name
        Type = $plan.type
        Amount = ($plan.amount / 100).ToString("N2")
        Currency = $plan.currency.ToUpper()
        ProductId = $product.id
        PriceId = $price.id
        PaymentLink = $paymentLink.url
    }
}

$results | ConvertTo-Json -Depth 5 | Set-Content -Path "stripe_plans.json" -Encoding UTF8
Write-Host "Todos os produtos, precos e Payment Links criados com sucesso!"
$results | Format-Table Name, Type, Amount, PaymentLink

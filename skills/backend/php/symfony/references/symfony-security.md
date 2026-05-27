# Symfony Security Reference

## Authentication Setup

```yaml
# config/packages/security.yaml
security:
  enable_authenticator_manager: true
  
  providers:
    user_provider:
      entity:
        class: App\Entity\User
        property: email
  
  firewalls:
    dev:
      pattern: ^/(_(profiler|wdt)|css|images|js)/
      security: false
    
    login:
      pattern: ^/api/login
      stateless: true
      json_login:
        check_path: /api/login
        username_path: email
        password_path: password
    
    api:
      pattern: ^/api
      stateless: true
      jwt: ~
    
    main:
      lazy: true
      provider: user_provider
      custom_authenticator: App\Security\LoginFormAuthenticator
  
  access_control:
    - { path: ^/api/login, roles: PUBLIC_ACCESS }
    - { path: ^/api/register, roles: PUBLIC_ACCESS }
    - { path: ^/api/admin, roles: ROLE_ADMIN }
    - { path: ^/api, roles: ROLE_USER }
    - { path: ^/admin, roles: ROLE_ADMIN }
```

## JWT Authentication

```bash
composer require lexik/jwt-authentication-bundle
```

```yaml
# config/packages/lexik_jwt_authentication.yaml
lexik_jwt_authentication:
  secret_key: '%env(resolve:JWT_SECRET_KEY)%'
  public_key: '%env(resolve:JWT_PUBLIC_KEY)%'
  pass_phrase: '%env(JWT_PASSPHRASE)%'
  token_ttl: 3600
```

```php
// src/Controller/AuthController.php
#[Route('/api/login', methods: ['POST'])]
public function login(#[CurrentUser] ?User $user, JWTTokener $tokener): JsonResponse
{
    if (null === $user) {
        return $this->json(['message' => 'Invalid credentials'], 401);
    }
    return $this->json([
        'token' => $tokener->create($user),
        'refresh_token' => $tokener->createRefresh($user),
    ]);
}
```

## Voter-Based Authorization

```php
// src/Security/OrderVoter.php
class OrderVoter extends Voter
{
    const VIEW = 'view';
    const EDIT = 'edit';
    const DELETE = 'delete';

    protected function supports(string $attribute, mixed $subject): bool
    {
        if (!in_array($attribute, [self::VIEW, self::EDIT, self::DELETE])) {
            return false;
        }
        if (!$subject instanceof Order) {
            return false;
        }
        return true;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token): bool
    {
        $user = $token->getUser();
        if (!$user instanceof User) {
            return false;
        }

        return match($attribute) {
            self::VIEW => $this->canView($subject, $user),
            self::EDIT => $this->canEdit($subject, $user),
            self::DELETE => $this->canDelete($subject, $user),
            default => throw new \LogicException('Unknown attribute'),
        };
    }

    private function canView(Order $order, User $user): bool
    {
        return $user === $order->getOwner() || in_array('ROLE_ADMIN', $user->getRoles());
    }

    private function canEdit(Order $order, User $user): bool
    {
        return $user === $order->getOwner();
    }
}
```

## CSRF Protection

```php
// config/packages/framework.yaml
framework:
  csrf_protection:
    enabled: true
```

```twig
<form method="post">
  <input type="hidden" name="_token" value="{{ csrf_token('form_action') }}">
  {# form fields #}
</form>
```

## Password Validation

```php
// src/Entity/User.php
use Symfony\Component\Validator\Constraints as Assert;

class User
{
    #[Assert\NotBlank]
    #[Assert\Email]
    private ?string $email = null;

    #[Assert\NotBlank]
    #[Assert\Length(min: 8, max: 128)]
    #[Assert\Regex(pattern: '/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/')]
    private ?string $password = null;
}
```

## Security Event Subscriber

```php
// src/EventListener/LoginSubscriber.php
class LoginSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [
            LoginSuccessEvent::class => 'onLoginSuccess',
            LoginFailureEvent::class => 'onLoginFailure',
        ];
    }

    public function onLoginSuccess(LoginSuccessEvent $event): void
    {
        $user = $event->getUser();
        $this->logger->info('Login success', ['email' => $user->getEmail()]);
    }
}
```

## Key Points

- Security bundle handles authentication via YAML configuration
- JWT authentication with LexikJWTAuthenticationBundle
- Voter-based authorization for fine-grained access control
- CSRF protection enabled for form-based authentication
- Password validation ensures minimum complexity requirements
- Event subscribers hook into login lifecycle
- Access control entries define path-based rules
- Stateless firewalls for API, stateful for web routes
- User providers connect to Doctrine entities
- Password hashing uses auto-configured algorithm

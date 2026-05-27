# Laminas Form and Validation Patterns

## Form Architecture

### Form Class
```php
<?php

declare(strict_types=1);

namespace App\Form;

use Laminas\Form\Element;
use Laminas\Form\Form;
use Laminas\InputFilter\InputFilter;
use Laminas\Validator;

class UserForm extends Form
{
    public function __construct()
    {
        parent::__construct('user');

        $this->setAttribute('method', 'POST');

        $this->add([
            'name' => 'email',
            'type' => Element\Email::class,
            'options' => [
                'label' => 'Email Address',
            ],
            'attributes' => [
                'required' => true,
                'placeholder' => 'user@example.com',
                'class' => 'form-control',
                'maxlength' => 255,
            ],
        ]);

        $this->add([
            'name' => 'password',
            'type' => Element\Password::class,
            'options' => [
                'label' => 'Password',
            ],
            'attributes' => [
                'required' => true,
                'class' => 'form-control',
                'minlength' => 8,
            ],
        ]);

        $this->add([
            'name' => 'name',
            'type' => Element\Text::class,
            'options' => [
                'label' => 'Full Name',
            ],
            'attributes' => [
                'required' => true,
                'class' => 'form-control',
                'maxlength' => 100,
            ],
        ]);

        $this->add([
            'name' => 'role',
            'type' => Element\Select::class,
            'options' => [
                'label' => 'Role',
                'value_options' => [
                    'user' => 'User',
                    'editor' => 'Editor',
                    'admin' => 'Administrator',
                ],
            ],
            'attributes' => [
                'class' => 'form-control',
            ],
        ]);

        $this->add([
            'name' => 'agree_terms',
            'type' => Element\Checkbox::class,
            'options' => [
                'label' => 'I agree to the terms and conditions',
                'checked_value' => 'yes',
                'unchecked_value' => 'no',
            ],
        ]);

        $this->add([
            'name' => 'submit',
            'type' => Element\Submit::class,
            'attributes' => [
                'value' => 'Save',
                'class' => 'btn btn-primary',
            ],
        ]);
    }
}
```

## Input Filter / Validation

### Input Filter Configuration
```php
<?php

declare(strict_types=1);

namespace App\Form;

use Laminas\Filter;
use Laminas\Form\Form;
use Laminas\InputFilter\InputFilterProviderInterface;
use Laminas\Validator;

class UserForm extends Form implements InputFilterProviderInterface
{
    // ... form elements ...

    public function getInputFilterSpecification(): array
    {
        return [
            'email' => [
                'required' => true,
                'filters' => [
                    ['name' => Filter\StringTrim::class],
                    ['name' => Filter\StripTags::class],
                    ['name' => Filter\ToNull::class],
                ],
                'validators' => [
                    [
                        'name' => Validator\EmailAddress::class,
                        'options' => [
                            'useMxCheck' => true,
                            'useDeepMxCheck' => true,
                        ],
                    ],
                    [
                        'name' => Validator\StringLength::class,
                        'options' => [
                            'max' => 255,
                        ],
                    ],
                    [
                        'name' => Validator\Db\NoRecordExists::class,
                        'options' => [
                            'table' => 'users',
                            'field' => 'email',
                            'adapter' => $this->getDbAdapter(),
                        ],
                    ],
                ],
            ],

            'password' => [
                'required' => true,
                'filters' => [
                    ['name' => Filter\StringTrim::class],
                ],
                'validators' => [
                    [
                        'name' => Validator\StringLength::class,
                        'options' => [
                            'min' => 8,
                            'max' => 128,
                        ],
                    ],
                    [
                        'name' => Validator\Regex::class,
                        'options' => [
                            'pattern' => '/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/',
                            'message' => 'Password must contain uppercase, lowercase, and digit',
                        ],
                    ],
                ],
            ],

            'name' => [
                'required' => true,
                'filters' => [
                    ['name' => Filter\StringTrim::class],
                    ['name' => Filter\StripTags::class],
                ],
                'validators' => [
                    [
                        'name' => Validator\StringLength::class,
                        'options' => [
                            'min' => 2,
                            'max' => 100,
                        ],
                    ],
                ],
            ],
        ];
    }
}
```

### Manual Input Filter
```php
<?php

use Laminas\InputFilter\InputFilter;
use Laminas\InputFilter\Input;
use Laminas\Validator;
use Laminas\Filter;

$email = new Input('email');
$email->getValidatorChain()
    ->attach(new Validator\EmailAddress())
    ->attach(new Validator\StringLength(['max' => 255]));

$email->getFilterChain()
    ->attach(new Filter\StringTrim())
    ->attach(new Filter\StripTags());

$inputFilter = new InputFilter();
$inputFilter->add($email);
```

## Custom Validator

### Unique Email Validator
```php
<?php

declare(strict_types=1);

namespace App\Validator;

use Laminas\Validator\AbstractValidator;
use PDO;

class UniqueEmail extends AbstractValidator
{
    public const NOT_UNIQUE = 'notUnique';
    public const INVALID = 'invalid';

    protected array $messageTemplates = [
        self::NOT_UNIQUE => 'The email "%value%" is already registered',
        self::INVALID => 'Invalid email address',
    ];

    public function __construct(
        private readonly PDO $pdo,
        ?array $options = null,
    ) {
        parent::__construct($options);
    }

    public function isValid(mixed $value): bool
    {
        $this->setValue($value);

        if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
            $this->error(self::INVALID);
            return false;
        }

        $excludeId = $this->getOption('exclude_id');

        $query = 'SELECT COUNT(*) FROM users WHERE email = :email';
        $params = ['email' => $value];

        if ($excludeId) {
            $query .= ' AND id != :exclude_id';
            $params['exclude_id'] = $excludeId;
        }

        $stmt = $this->pdo->prepare($query);
        $stmt->execute($params);
        $count = (int) $stmt->fetchColumn();

        if ($count > 0) {
            $this->error(self::NOT_UNIQUE);
            return false;
        }

        return true;
    }
}
```

## Form Handling in Controller

### Controller Method
```php
<?php

declare(strict_types=1);

namespace App\Controller;

use App\Form\UserForm;
use App\Repository\UserRepository;
use Laminas\Mvc\Controller\AbstractActionController;
use Laminas\View\Model\ViewModel;

class UserController extends AbstractActionController
{
    public function __construct(
        private readonly UserForm $userForm,
        private readonly UserRepository $userRepository,
    ) {}

    public function createAction()
    {
        $form = $this->userForm;

        if ($this->getRequest()->isPost()) {
            $form->setData($this->getRequest()->getPost());

            if ($form->isValid()) {
                $data = $form->getData();
                $user = $this->userRepository->createUser($data);

                $this->flashMessenger()->addSuccessMessage('User created successfully');
                return $this->redirect()->toRoute('users');
            }
        }

        return new ViewModel([
            'form' => $form,
        ]);
    }

    public function editAction()
    {
        $id = (int) $this->params('id');
        $user = $this->userRepository->findById($id);

        if (!$user) {
            return $this->notFoundAction();
        }

        $form = $this->userForm;
        $form->bind($user);
        $form->get('password')->setAttribute('required', false);

        if ($this->getRequest()->isPost()) {
            $form->setData($this->getRequest()->getPost());

            if ($form->isValid()) {
                $this->userRepository->updateUser($user, $form->getData());

                $this->flashMessenger()->addSuccessMessage('User updated');
                return $this->redirect()->toRoute('users');
            }
        }

        return new ViewModel([
            'form' => $form,
            'user' => $user,
        ]);
    }
}
```

## Form Collections

### Collection Form
```php
<?php

declare(strict_types=1);

namespace App\Form;

use Laminas\Form\Element\Collection;
use Laminas\Form\Form;
use Laminas\InputFilter\InputFilterProviderInterface;

class OrderForm extends Form implements InputFilterProviderInterface
{
    public function __construct()
    {
        parent::__construct('order');

        $this->add([
            'name' => 'customer_id',
            'type' => Element\Hidden::class,
        ]);

        $this->add([
            'name' => 'items',
            'type' => Collection::class,
            'options' => [
                'label' => 'Order Items',
                'count' => 1,
                'should_create_template' => true,
                'allow_add' => true,
                'allow_remove' => true,
                'target_element' => [
                    'type' => OrderItemFieldset::class,
                ],
            ],
        ]);
    }

    public function getInputFilterSpecification(): array
    {
        return [
            'customer_id' => [
                'required' => true,
                'filters' => [['name' => 'Int']],
            ],
        ];
    }
}

class OrderItemFieldset extends Fieldset implements InputFilterProviderInterface
{
    public function __construct()
    {
        parent::__construct('item');

        $this->add([
            'name' => 'product_id',
            'type' => Element\Hidden::class,
        ]);

        $this->add([
            'name' => 'quantity',
            'type' => Element\Number::class,
            'options' => ['label' => 'Quantity'],
            'attributes' => ['min' => 1, 'max' => 999],
        ]);

        $this->add([
            'name' => 'unit_price',
            'type' => Element\Number::class,
            'options' => ['label' => 'Unit Price'],
            'attributes' => ['step' => 0.01, 'min' => 0],
        ]);
    }

    public function getInputFilterSpecification(): array
    {
        return [
            'product_id' => ['required' => true, 'filters' => [['name' => 'Int']]],
            'quantity' => [
                'required' => true,
                'validators' => [
                    ['name' => 'Digits'],
                    ['name' => 'Between', 'options' => ['min' => 1, 'max' => 999]],
                ],
            ],
            'unit_price' => [
                'required' => true,
                'validators' => [
                    ['name' => 'Float'],
                    ['name' => 'GreaterThan', 'options' => ['min' => 0]],
                ],
            ],
        ];
    }
}
```

## Key Points
- Laminas Form encapsulates form definition, validation, and rendering
- Input filters provide validation and filtering chain per field
- Custom validators extend AbstractValidator for domain-specific rules
- Db validators check uniqueness against database tables
- Form binding populates entity from form data and vice versa
- Form collections handle dynamic multi-item forms
- InputFilterProviderInterface keeps validation with form definition
- Filters sanitize input (StringTrim, StripTags) before validation
- CSRF protection is built into Laminas forms
- Form error messages are localized and customizable

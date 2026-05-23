# Notation Reference for Machine Learning Mathematics

## Greek Letters

| Symbol | Name | Meaning |
|---|---|---|
| α (alpha) | Alpha | Learning rate, regularization strength, significance level, momentum coefficient |
| β (beta) | Beta | Momentum decay, regularization coefficient, temperature scaling |
| γ (gamma) | Gamma | Learning rate decay, Focal Loss modulating factor, kernel bandwidth |
| δ (delta) | Delta | Small change, Dirac delta, error signal in backpropagation (δ[l]) |
| ε (epsilon) | Epsilon | Small constant (avoid division by zero), noise in SGD |
| ζ (zeta) | Zeta | Riemann zeta (rare in ML) |
| η (eta) | Eta | Learning rate (step size in GD) |
| θ (theta) | Theta | Model parameters (θ = [W, b]) |
| κ (kappa) | Kappa | Condition number, concentration parameter |
| λ (lambda) | Lambda | Regularization coefficient, eigenvalue, Lagrange multiplier |
| μ (mu) | Mu | Mean of a distribution, centroid in clustering |
| ν (nu) | Nu | Degrees of freedom, SVM margin parameter |
| ξ (xi) | Xi | Slack variable (SVM soft margin), random variable |
| π (pi) | Pi | Mixing coefficient, Categorical distribution parameter |
| ρ (rho) | Rho | Correlation coefficient, learning rate multiplier |
| σ (sigma) | Sigma | Standard deviation, sigmoid activation function σ(x)=1/(1+e^{-x}) |
| τ (tau) | Tau | Temperature in softmax, quantile in pinball loss |
| φ (phi) | Phi | Feature map (kernel trick), Normal CDF (GELU) |
| χ (chi) | Chi | Chi-squared distribution |
| ψ (psi) | Psi | Digamma function, wave function |
| ω (omega) | Omega | Angular frequency, sample in probability space |

## Calligraphic Letters

| Symbol | Name | Meaning |
|---|---|---|
| ℙ | Probability | Probability measure ℙ(X), ℙ(A|B) |
| 𝔼 | Expectation | Expected value 𝔼[X], 𝔼[f(X)] |
| 𝕍 | Variance | Variance 𝕍[X], 𝕍[θ̂] |
| 𝒩 | Normal | Gaussian distribution 𝒩(μ, σ²) |
| ℒ | Lagrangian | Lagrangian function L(x, λ) |
| ℋ | Hypothesis | Hypothesis class ℋ, Hilbert space |
| ℐ | Fisher Information | Fisher Information Matrix ℐ(θ) |

## Blackboard Bold

| Symbol | Name | Meaning |
|---|---|---|
| ℝ | Real numbers | ℝ, ℝⁿ, ℝ^{m×n} |
| ℕ | Natural numbers | ℕ = {0, 1, 2, ...} |
| ℤ | Integers | ℤ (ring of integers) |
| ℂ | Complex numbers | ℂ (complex plane) |

## Operators

| Symbol | Name | Meaning |
|---|---|---|
| ∇ | Nabla | Gradient ∇f = (∂f/∂x₁, ..., ∂f/∂x_n)^T |
| ∇² | Laplacian | Sum of second derivatives ∇²f = Σ∂²f/∂xᵢ² |
| ∂ | Partial derivative | ∂f/∂x, ∂²f/∂x∂y |
| Δ | Delta | Difference operator, Laplacian (alternative) |
| Σ | Sigma | Summation Σ_{i=1}^{n} aᵢ |
| Π | Pi | Product Π_{i=1}^{n} aᵢ |
| ∫ | Integral | Integration ∫f(x)dx, ∫∫ double integral |
| ∏ | Product | Same as Π (tensor product in some contexts) |
| ∑ | Sum | Same as Σ |
| ∈ | Element | x ∈ ℝ (x is in ℝ) |
| ⊂ | Subset | A ⊂ B (A is subset of B) |
| ∪ | Union | A ∪ B |
| ∩ | Intersection | A ∩ B |
| ∅ | Empty set | ∅ |
| ∀ | For all | ∀x > 0 |
| ∃ | There exists | ∃x such that |

## Norms and Products

| Symbol | Name | Meaning |
|---|---|---|
| ‖·‖ | Norm | Usually L2 norm; ‖x‖₂ = √Σxᵢ² |
| ‖·‖₁ | L1 norm | ‖x‖₁ = Σ|xᵢ| |
| ‖·‖₂ | L2 norm | ‖x‖₂ = √Σxᵢ² |
| ‖·‖_F | Frobenius norm | ‖A‖_F = √ΣΣaᵢⱼ² = √tr(A^TA) |
| ‖·‖_p | Lp norm | ‖x‖_p = (Σ|xᵢ|^p)^{1/p} |
| ‖·‖_∞ | L∞ norm | ‖x‖_∞ = max|xᵢ| |
| ⟨·,·⟩ | Inner product | ⟨a, b⟩ = a^Tb = Σaᵢbᵢ |
| ⊗ | Kronecker product | A⊗B (block matrix, each element of A × B) |
| ⊙ | Hadamard product | A⊙B (element-wise multiplication) |
| ∘ | Function composition | f∘g = f(g(x)) |
| ∗ | Convolution | f∗g, also used for element-wise multiplication |
| × | Cartesian product | A×B, cross product in 3D |

## Matrix Notation

| Symbol | Meaning |
|---|---|
| A^T | Transpose of matrix A |
| A^{-1} | Inverse of matrix A |
| A⁺ | Moore-Penrose pseudoinverse |
| A^{1/2} | Matrix square root (A = A^{1/2}A^{1/2}) |
| tr(A) | Trace = Σa_{ii} |
| det(A) | Determinant |
| ran(A) | Column space (range) of A |
| null(A) | Null space (kernel) of A |
| diag(a) | Diagonal matrix with vector a on diagonal |
| λ(A) | Eigenvalues of A (spectrum) |
| vec(A) | Vectorization (stack columns) |
| cov(X) | Covariance matrix |
| I_n | n×n identity matrix |
| 𝟙 | Indicator function 𝟙_{condition} = 1 if condition true, else 0 |

## Probability Notation

| Symbol | Meaning |
|---|---|
| X ∼ P | Random variable X drawn from distribution P |
| p(x) | PMF (discrete) or PDF (continuous) |
| ℙ(A) | Probability of event A |
| ℙ(A|B) | Conditional probability |
| F(x) | CDF = ℙ(X ≤ x) |
| 𝔼[X] | Expected value |
| 𝕍[X] | Variance |
| Cov(X,Y) | Covariance |
| Corr(X,Y) | Correlation |
| X ⟂ Y | X independent of Y |
| X ⟂ Y \| Z | X conditionally independent of Y given Z |

## Common Distributions

| Notation | Distribution |
|---|---|
| 𝒩(μ, σ²) | Normal (Gaussian) |
| 𝒩(μ, Σ) | Multivariate Normal |
| Ber(p) | Bernoulli |
| Bin(n, p) | Binomial |
| Cat(π) | Categorical (π is probability vector) |
| Poi(λ) | Poisson |
| Exp(λ) | Exponential |
| Beta(α, β) | Beta |
| Dir(α) | Dirichlet |
| Gam(α, β) | Gamma |
| Lap(μ, b) | Laplace |
| U(a, b) | Uniform on [a, b] |
| χ²(k) | Chi-squared with k degrees of freedom |
| t(k) | Student's t with k degrees of freedom |
| F(d₁, d₂) | F-distribution |

## Optimization Notation

| Symbol | Meaning |
|---|---|
| η | Learning rate |
| g_t | Gradient at step t = ∇L(θ_t) |
| m_t | First moment (mean of gradients) |
| v_t | Second moment (variance of gradients) |
| β₁, β₂ | Adam decay rates (β₁ for 1st moment, β₂ for 2nd) |
| ε | Small constant in Adam/RMSProp for numerical stability |
| θ_{t+1} | Parameters after update |
| L(θ) | Loss function |
| ∇L(θ) | Gradient of loss wrt parameters |
| H(θ) | Hessian matrix of second derivatives |

## Deep Learning Notation

| Symbol | Meaning |
|---|---|
| W[l] | Weight matrix at layer l |
| b[l] | Bias vector at layer l |
| z[l] | Pre-activation = W[l]a[l-1] + b[l] |
| a[l] | Activation = f(z[l]) |
| δ[l] | Error signal = ∂L/∂z[l] |
| g_W[l] | Weight gradient = a[l-1]ᵀδ[l] |
| ⊙ | Element-wise (Hadamard) product for backprop |
| σ(x) | Sigmoid 1/(1+e^{-x}) |
| φ(x) | Normal CDF (in GELU) |
| softmax(z) | e^{zⱼ}/Σe^{z_k} |
| logsumexp(z) | log(Σe^{z_k}) |

## Common Abbreviations

| Abbr | Full |
|---|---|
| GD | Gradient Descent |
| SGD | Stochastic Gradient Descent |
| MLE | Maximum Likelihood Estimation |
| MAP | Maximum A Posteriori |
| KL | Kullback-Leibler |
| JS | Jensen-Shannon |
| BCE | Binary Cross-Entropy |
| CCE | Categorical Cross-Entropy |
| ELBO | Evidence Lower Bound |
| EM | Expectation-Maximization |
| SVD | Singular Value Decomposition |
| PCA | Principal Component Analysis |
| iid | Independent and identically distributed |
| wrt | With respect to |
| LHS/RHS | Left/Right Hand Side |
| wlog | Without loss of generality |
